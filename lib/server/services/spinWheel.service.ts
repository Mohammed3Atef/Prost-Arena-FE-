import '@/lib/models';
import type { Types } from 'mongoose';
import { SpinWheelConfig, SpinLog, type ISpinSegment } from '@/lib/db/models/spinWheel';
import { UserReward } from '@/lib/db/models/userReward';
import { User } from '@/lib/db/models/user';
import { Reward } from '@/lib/db/models/reward';
import { operationalError } from '@/lib/server/error';
import { progressMissions } from '@/lib/server/services/order.service';

async function cooldownSecs(): Promise<number> {
  const wheel = await SpinWheelConfig.findOne({ isActive: true })
    .select('spinCooldownHours').lean<any>();
  return ((wheel?.spinCooldownHours ?? 24) as number) * 3600;
}

async function secondsRemaining(userId: string | Types.ObjectId, cooldown: number): Promise<number> {
  const user = await User.findById(userId).select('lastSpinAt').lean<any>();
  if (!user?.lastSpinAt) return 0;
  const elapsed = (Date.now() - new Date(user.lastSpinAt).getTime()) / 1000;
  const left = Math.ceil(cooldown - elapsed);
  return left > 0 ? left : 0;
}

function weightedRandom(weights: number[]): number {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export async function getActiveWheel() {
  let wheel: any = await SpinWheelConfig.findOne({ isActive: true })
    .populate('segments.reward').lean();

  if (!wheel) {
    let discountReward = await Reward.findOne({ code: 'WHEEL5', isActive: true });
    if (!discountReward) {
      discountReward = await Reward.create({
        name: '5% Off Your Order',
        type: 'discount_pct',
        discountPct: 5,
        code: 'WHEEL5',
        isActive: true,
        source: 'spin_wheel',
      });
    }

    const defaultWheel = await SpinWheelConfig.create({
      name: 'Default Wheel',
      isActive: true,
      spinCooldownHours: 24,
      segments: [
        { label: '50 XP', type: 'xp_boost', xpAmount: 50, probability: 0.25, color: '#ff6b35', icon: '⚡' },
        { label: '100 XP', type: 'xp_boost', xpAmount: 100, probability: 0.15, color: '#e55a2b', icon: '⚡' },
        { label: '20 Points', type: 'points', pointsAmount: 20, probability: 0.20, color: '#f59e0b', icon: '⭐' },
        { label: '50 Points', type: 'points', pointsAmount: 50, probability: 0.12, color: '#d97706', icon: '⭐' },
        { label: 'Try Again', type: 'empty', probability: 0.15, color: '#6b7280', icon: '🔄' },
        { label: '5% Off', type: 'reward', reward: discountReward._id, probability: 0.08, color: '#10b981', icon: '🎫' },
        { label: '200 XP', type: 'xp_boost', xpAmount: 200, probability: 0.04, color: '#8b5cf6', icon: '💎' },
        { label: 'Jackpot!', type: 'points', pointsAmount: 200, probability: 0.01, color: '#fbbf24', icon: '🏆' },
      ],
    });
    console.log('[spin] auto-seeded default spin wheel');
    wheel = await SpinWheelConfig.findById(defaultWheel._id).populate('segments.reward').lean();
  }

  if (!wheel) throw operationalError('No active spin wheel', 404);

  return {
    ...wheel,
    segments: wheel.segments.map(({ probability, ...s }: ISpinSegment & { probability: number }) => s),
  };
}

export async function spin(userId: string | Types.ObjectId) {
  const [user, wheelDoc] = await Promise.all([
    User.findById(userId),
    SpinWheelConfig.findOne({ isActive: true }).populate('segments.reward').lean<any>(),
  ]);
  if (!user) throw operationalError('User not found', 404);
  if (!wheelDoc) throw operationalError('No active spin wheel', 404);

  const cooldown = ((wheelDoc.spinCooldownHours || 24) as number) * 3600;
  const hasBonusSpin = user.bonusSpins > 0;

  if (!hasBonusSpin) {
    const left = await secondsRemaining(userId, cooldown);
    if (left > 0) {
      const hours = Math.ceil(left / 3600);
      const e = operationalError(
        `You already spun today. Come back in ${hours} hour${hours !== 1 ? 's' : ''}!`,
        429,
      );
      (e as any).secondsLeft = left;
      throw e;
    }
  }

  const segments: any[] = wheelDoc.segments;
  const segmentIndex = weightedRandom(segments.map((s) => s.probability));
  const segment = segments[segmentIndex];

  let userReward: any = null;
  let xpAwarded = 0;
  let pointsAwarded = 0;

  if (hasBonusSpin) user.bonusSpins = Math.max(0, user.bonusSpins - 1);

  if (segment.type === 'reward' && segment.reward) {
    userReward = await UserReward.create({
      user: userId,
      reward: segment.reward._id,
      source: 'spin_wheel',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } else if (segment.type === 'xp_boost') {
    xpAwarded = segment.xpAmount || 50;
    user.addXp(xpAwarded);
  } else if (segment.type === 'points') {
    pointsAwarded = segment.pointsAmount || 20;
    user.points += pointsAwarded;
  }

  user.lastSpinAt = new Date();
  await user.save();

  // Bump any active 'spin' mission. Wrapped inside progressMissions itself so
  // a mission glitch never blocks the spin response.
  await progressMissions(userId, 'spin', 1);

  await SpinLog.create({
    user: userId,
    wheel: wheelDoc._id,
    segmentIndex,
    segmentLabel: segment.label,
    reward: segment.reward?._id ?? null,
    userReward: userReward?._id ?? null,
    xpAwarded,
    pointsAwarded,
  });

  console.log(`[spin] user ${userId} → ${segment.label}${hasBonusSpin ? ' (bonus)' : ''}`);

  return {
    segment: {
      index: segmentIndex,
      label: segment.label,
      type: segment.type,
      icon: segment.icon,
    },
    userReward,
    xpAwarded,
    pointsAwarded,
  };
}

export async function checkAvailability(userId: string | Types.ObjectId) {
  const cooldown = await cooldownSecs();
  const [left, user] = await Promise.all([
    secondsRemaining(userId, cooldown),
    User.findById(userId).select('bonusSpins lastSpinAt').lean<any>(),
  ]);
  const bonusSpins = user?.bonusSpins ?? 0;
  return {
    canSpin: left <= 0 || bonusSpins > 0,
    secondsLeft: left > 0 ? left : 0,
    bonusSpins,
  };
}
