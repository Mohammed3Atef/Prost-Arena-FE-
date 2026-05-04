import '@/lib/models';
import { Order, type IOrder } from '@/lib/db/models/order';
import { MenuItem } from '@/lib/db/models/menuItem';
import { User } from '@/lib/db/models/user';
import { Referral } from '@/lib/db/models/referral';
import { Reward, type IReward } from '@/lib/db/models/reward';
import { UserReward } from '@/lib/db/models/userReward';
import { Mission, UserMission } from '@/lib/db/models/mission';
import { getSiteSettings } from '@/lib/db/models/siteSettings';
import { calcOrderXp, calcOrderPoints, XP_PER_REFERRAL } from '@/lib/server/gamification';
import { operationalError } from '@/lib/server/error';
import type { Types } from 'mongoose';

export interface CreateOrderInput {
  items: Array<{
    menuItem: string | Types.ObjectId;
    quantity: number;
    addOns?: Array<{ name: string; price: number }>;
    specialNote?: string;
  }>;
  guestInfo?: { name?: string; email?: string; phone?: string };
  deliveryFee?: number;
  couponCode?: string;
  userRewardId?: string;
  type?: 'dine-in' | 'takeaway' | 'delivery';
  deliveryAddress?: { street?: string; city?: string; zip?: string; coords?: { lat: number; lng: number } };
  paymentMethod?: 'cash' | 'card' | 'points' | 'mixed';
  notes?: string;
}

export function calcDiscount(reward: IReward, subtotal: number, deliveryFee = 0): number {
  switch (reward.type) {
    case 'discount_pct':
      return Math.round((subtotal * (reward.discountPct || 0)) / 100 * 100) / 100;
    case 'discount_fixed':
      return Math.min(reward.discountFixed || 0, subtotal);
    case 'free_delivery':
      return deliveryFee;
    default:
      return 0;
  }
}

/**
 * Bumps every active mission of the given type by `increment` for this user.
 * Auto-completes missions when progress >= target so the customer's claim
 * button lights up. Exported so other services (spin, challenge, auth) can
 * call it from their own event hooks without re-implementing the logic.
 */
export async function progressMissions(
  userId: string | Types.ObjectId,
  type: string,
  increment: number,
) {
  try {
    const missions = await Mission.find({ type, isActive: true }).lean();
    for (const mission of missions) {
      const um = await UserMission.findOneAndUpdate(
        { user: userId, mission: mission._id, status: 'active' },
        { $inc: { progress: increment } },
        { upsert: true, new: true },
      );
      if (um && um.progress >= mission.target && um.status === 'active') {
        um.status = 'completed';
        um.completedAt = new Date();
        await um.save();
      }
    }
  } catch (err) {
    console.warn(`[mission] progress update failed for type=${type}:`, err);
  }
}

async function checkReferralQualification(order: IOrder, userId: string | Types.ObjectId) {
  try {
    const referral = await Referral.findOne({ referred: userId, status: 'pending' });
    if (!referral) return;

    const isFirstOrder = (await Order.countDocuments({ user: userId })) === 1;
    if (!isFirstOrder) return;

    referral.qualifyingOrder = order._id as Types.ObjectId;
    referral.status = 'rewarded';
    referral.rewardedAt = new Date();
    await referral.save();

    await User.findByIdAndUpdate(referral.referrer, { $inc: { xp: XP_PER_REFERRAL, points: 50 } });
    await User.findByIdAndUpdate(referral.referred, { $inc: { xp: XP_PER_REFERRAL, points: 25 } });

    await progressMissions(referral.referrer, 'referral', 1);

    console.log(`[order] referral ${referral._id} rewarded`);
  } catch (err) {
    console.warn('[order] referral check failed:', err);
  }
}

async function awardOrderRewards(order: IOrder, userId: string | Types.ObjectId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const xp = calcOrderXp({ total: order.total });
  const points = calcOrderPoints({ total: order.total });

  const settings = await getSiteSettings();
  const { didLevelUp, newLevel } = user.addXp(xp, settings.xpPerLevelCoeff ?? 100);
  user.points += points;
  user.ordersCount += 1;
  user.lastLoginAt = user.lastLoginAt || new Date();

  order.xpAwarded = xp;
  order.pointsAwarded = points;
  order.xpAwardedAt = new Date();

  await Promise.all([user.save(), order.save()]);

  await progressMissions(userId, 'order_count', 1);
  await progressMissions(userId, 'spend_amount', Math.round(order.total));

  // order_new_item: count items the user is ordering for the first time ever.
  // Compare this order's menuItem ids against the distinct list of items the
  // user has ever ordered before THIS order. Anything not in the prior list
  // is a "first time" — bump the mission by that count.
  try {
    const itemIds = order.items.map((i: any) => String(i.menuItem));
    const priorItems: any[] = await Order.distinct('items.menuItem', {
      user: userId,
      _id: { $ne: order._id },
    });
    const seen = new Set(priorItems.map(String));
    const newItemCount = itemIds.filter((id: string) => !seen.has(id)).length;
    if (newItemCount > 0) {
      await progressMissions(userId, 'order_new_item', newItemCount);
    }
  } catch (err) {
    console.warn('[order] order_new_item progress failed:', err);
  }

  await checkReferralQualification(order, userId);

  if (didLevelUp) console.log(`[order] user ${userId} levelled up to ${newLevel}`);

  return { xp, points, didLevelUp, newLevel };
}

export async function createOrder(input: CreateOrderInput, userId: string | Types.ObjectId | null = null) {
  const itemIds = input.items.map((i) => i.menuItem);
  const menuItems = await MenuItem.find({ _id: { $in: itemIds } }).lean();
  const menuMap = Object.fromEntries(menuItems.map((m: any) => [m._id.toString(), m]));

  const resolvedItems = [];
  let subtotal = 0;

  for (const item of input.items) {
    const menu = menuMap[item.menuItem.toString()];
    if (!menu) throw operationalError(`Item ${item.menuItem} not found`, 404);
    if (!menu.isAvailable) throw operationalError(`${menu.name} is not available`, 400);

    if (menu.isSecret && userId) {
      const user = await User.findById(userId).lean<any>();
      if (user && user.level < menu.requiredLevel) {
        throw operationalError(`${menu.name} unlocks at level ${menu.requiredLevel}`, 403);
      }
    }

    let addOnTotal = 0;
    const addOns = (item.addOns || []).map((a) => {
      addOnTotal += a.price || 0;
      return a;
    });

    const itemSubtotal = (menu.price + addOnTotal) * item.quantity;
    subtotal += itemSubtotal;

    resolvedItems.push({
      menuItem: menu._id,
      name: menu.name,
      price: menu.price,
      quantity: item.quantity,
      addOns,
      specialNote: item.specialNote || '',
      subtotal: itemSubtotal,
    });
  }

  let discount = 0;
  let couponCode: string | null = null;
  let couponReward: Types.ObjectId | null = null;
  let appliedUserRewardId: Types.ObjectId | null = null;
  let deliveryFee = input.deliveryFee || 0;

  if (input.couponCode && userId) {
    const reward = await Reward.findOne({ code: input.couponCode.toUpperCase(), isActive: true });
    if (reward) {
      const discountAmt = calcDiscount(reward, subtotal, deliveryFee);
      if (discountAmt > 0) {
        discount = discountAmt;
        couponCode = reward.code || null;
        couponReward = reward._id as Types.ObjectId;
        if (reward.type === 'free_delivery') deliveryFee = 0;
        Reward.findByIdAndUpdate(reward._id, { $inc: { usedCount: 1 } }).catch(() => {});
      }
    }
  }

  if (!discount && input.userRewardId && userId) {
    const ur = await UserReward.findOne({
      _id: input.userRewardId,
      user: userId,
      status: 'active',
    }).populate<{ reward: IReward }>('reward');

    if (ur && ur.reward) {
      const reward = ur.reward;
      if (!reward.expiresAt || reward.expiresAt > new Date()) {
        const discountAmt = calcDiscount(reward, subtotal, deliveryFee);
        if (discountAmt > 0) {
          discount = discountAmt;
          couponReward = reward._id as Types.ObjectId;
          appliedUserRewardId = ur._id as Types.ObjectId;
          if (reward.type === 'free_delivery') deliveryFee = 0;
        }
      }
    }
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  const order = await Order.create({
    user: userId,
    guestInfo: input.guestInfo,
    items: resolvedItems,
    subtotal,
    discount,
    deliveryFee,
    total,
    couponCode,
    couponReward,
    type: input.type || 'takeaway',
    deliveryAddress: input.deliveryAddress,
    paymentMethod: input.paymentMethod || 'cash',
    notes: input.notes,
  });

  if (appliedUserRewardId) {
    UserReward.findByIdAndUpdate(appliedUserRewardId, {
      status: 'used',
      usedAt: new Date(),
      usedOnOrder: order._id,
    }).catch(() => {});
  }

  if (userId) {
    await awardOrderRewards(order, userId);
  }

  MenuItem.updateMany({ _id: { $in: itemIds } }, { $inc: { ordersCount: 1 } })
    .catch((e) => console.warn('[order] MenuItem counter update failed:', e?.message));

  return order;
}

export async function updateStatus(orderId: string, status: string, note = '') {
  const order = await Order.findById(orderId);
  if (!order) throw operationalError('Order not found', 404);

  order.status = status as IOrder['status'];
  order.statusHistory.push({ status, note, timestamp: new Date() });
  await order.save();

  return order;
}

export async function getOrders(opts: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string | Types.ObjectId;
} = {}) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const filter: any = {};
  if (opts.status) filter.status = opts.status;
  if (opts.userId) filter.user = opts.userId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('user', 'name email avatar level')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { items, total };
}
