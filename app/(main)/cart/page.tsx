"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Tag,
  Gift,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useCartStore } from "../../../store/useCartStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { formatCurrency } from "../../../lib/utils";
import api from "../../../services/api/client";
import toast from "react-hot-toast";
import Image from "next/image";

interface UserReward {
  _id: string;
  source: string;
  expiresAt: string | null;
  reward: {
    _id: string;
    name: string;
    type: "discount_pct" | "discount_fixed" | "free_delivery";
    discountPct?: number;
    discountFixed?: number;
    description?: string;
  };
}

function rewardLabel(ur: UserReward): string {
  const { reward } = ur;
  if (reward.type === "discount_pct")
    return `${reward.discountPct}% off your order`;
  if (reward.type === "discount_fixed")
    return `$${reward.discountFixed?.toFixed(2)} off`;
  if (reward.type === "free_delivery") return "Free delivery";
  return reward.name;
}

function rewardEmoji(type: string): string {
  if (type === "discount_pct") return "🏷️";
  if (type === "discount_fixed") return "💸";
  if (type === "free_delivery") return "🚚";
  return "🎁";
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    items,
    coupon,
    userRewardId,
    discount,
    updateQty,
    removeItem,
    applyCoupon,
    applyUserReward,
    removeCoupon,
    subtotal,
    total,
    clearCart,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  // User rewards (spin wheel / challenge wins)
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [showRewardsPanel, setShowRewardsPanel] = useState(false);
  const [applyingRewardId, setApplyingRewardId] = useState<string | null>(null);

  const DELIVERY_FEE = 2.99;

  // Fetch active user rewards when logged in
  useEffect(() => {
    if (!user) return;
    setRewardsLoading(true);
    api
      .get("/rewards/mine")
      .then(({ data }) => setUserRewards(data.data ?? []))
      .catch(() => {})
      .finally(() => setRewardsLoading(false));
  }, [user]);

  const handleCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post("/orders/validate-coupon", {
        code: couponInput.trim(),
        orderTotal: subtotal(),
        deliveryFee: DELIVERY_FEE,
      });
      applyCoupon(couponInput.trim().toUpperCase(), data.data.discountAmount);
      toast.success(
        `Coupon applied! -${formatCurrency(data.data.discountAmount)}`,
      );
      setCouponInput("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyUserReward = async (ur: UserReward) => {
    setApplyingRewardId(ur._id);
    try {
      const { data } = await api.post("/orders/validate-coupon", {
        userRewardId: ur._id,
        orderTotal: subtotal(),
        deliveryFee: DELIVERY_FEE,
      });
      applyUserReward(ur._id, data.data.discountAmount);
      setShowRewardsPanel(false);
      toast.success(
        `Reward applied! -${formatCurrency(data.data.discountAmount)}`,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not apply reward");
    } finally {
      setApplyingRewardId(null);
    }
  };

  const appliedUserReward = userRewards.find((ur) => ur._id === userRewardId);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please log in to place an order");
      router.push("/login");
      return;
    }
    if (items.length === 0) return;

    setPlacing(true);
    try {
      const payload: Record<string, any> = {
        items: items.map((i) => ({
          menuItem: i.menuItemId,
          quantity: i.quantity,
          addOns: i.addOns,
          specialNote: i.specialNote,
        })),
        deliveryFee: DELIVERY_FEE,
      };
      if (coupon) payload.couponCode = coupon;
      if (userRewardId) payload.userRewardId = userRewardId;

      const { data } = await api.post("/orders", payload);
      clearCart();
      toast.success("Order placed! 🎉 You earned XP!", { duration: 5000 });
      router.push(`/orders/${data.data._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="text-8xl"
        >
          🛒
        </motion.div>
        <div>
          <h2 className="section-title mb-2">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Add some items from the menu to get started
          </p>
        </div>
        <Link href="/menu" className="btn-primary inline-flex">
          Browse Menu
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-28 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <h1 className="section-title">
            Your Cart ({items.length} item{items.length !== 1 ? "s" : ""})
          </h1>

          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                className="card p-4 flex gap-4"
              >
                {/* Image */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-arena-600 shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </h3>
                  {item.addOns.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      + {item.addOns.map((a) => a.name).join(", ")}
                    </p>
                  )}
                  {item.specialNote && (
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      "{item.specialNote}"
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 gap-2">
                    {/* Qty control */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-arena-700 rounded-xl p-1">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-arena-600 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-arena-600 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.subtotal)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <h2 className="section-title text-lg">Order Summary</h2>

          {/* ── Discounts section ── */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Tag size={16} className="text-brand-500" />
              Discounts
            </h3>

            {/* Active discount display */}
            {(coupon || appliedUserReward) && (
              <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">
                    {appliedUserReward
                      ? rewardEmoji(appliedUserReward.reward.type)
                      : "🏷️"}
                  </span>
                  <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 truncate">
                    {appliedUserReward
                      ? rewardLabel(appliedUserReward)
                      : coupon}
                  </span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-red-400 hover:text-red-600 ml-2 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* User rewards (spin wheel / challenge wins) */}
            {user && !coupon && !appliedUserReward && (
              <>
                {rewardsLoading ? (
                  <div className="skeleton h-10 rounded-xl" />
                ) : userRewards.length > 0 ? (
                  <div>
                    <button
                      onClick={() => setShowRewardsPanel((p) => !p)}
                      className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Gift size={14} className="text-brand-500" />
                        {userRewards.length} reward
                        {userRewards.length !== 1 ? "s" : ""} available
                      </span>
                      {showRewardsPanel ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                    <AnimatePresence>
                      {showRewardsPanel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-2">
                            {userRewards.map((ur) => (
                              <button
                                key={ur._id}
                                onClick={() => handleApplyUserReward(ur)}
                                disabled={applyingRewardId === ur._id}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-arena-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all text-left group"
                              >
                                <span className="text-xl shrink-0">
                                  {rewardEmoji(ur.reward.type)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {rewardLabel(ur)}
                                  </p>
                                  <p className="text-xs text-gray-400 capitalize">
                                    {ur.source.replace("_", " ")}
                                  </p>
                                </div>
                                <span className="text-xs text-brand-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {applyingRewardId === ur._id
                                    ? "..."
                                    : "Apply"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : null}
              </>
            )}

            {/* Manual coupon code input (only when no reward applied) */}
            {!coupon && !appliedUserReward && (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleCoupon()}
                  placeholder="Enter code"
                  className="input text-sm py-2 font-mono"
                />
                <button
                  onClick={handleCoupon}
                  disabled={couponLoading}
                  className="btn-secondary py-2 px-3 text-sm whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="card p-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Delivery fee</span>
              <span>{formatCurrency(DELIVERY_FEE)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 dark:border-arena-600 pt-3 flex justify-between font-bold text-gray-900 dark:text-gray-100">
              <span>Total</span>
              <span>{formatCurrency(total(DELIVERY_FEE))}</span>
            </div>
          </div>

          {/* Desktop checkout button */}
          <motion.button
            onClick={handleCheckout}
            disabled={placing}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full py-4 text-base hidden lg:flex"
          >
            {placing ? (
              "⟳ Placing order…"
            ) : (
              <>
                <ShoppingBag size={20} />
                Place Order · {formatCurrency(total(DELIVERY_FEE))}
              </>
            )}
          </motion.button>

          <p className="hidden lg:block text-xs text-center text-gray-400 dark:text-gray-500">
            🎮 You'll earn XP for this order!
          </p>
        </div>
      </div>

      {/* Mobile sticky checkout footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-arena-900/95 backdrop-blur-md border-t border-gray-100 dark:border-arena-700 px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total{" "}
            {discount > 0 && (
              <span className="text-green-500">
                (-{formatCurrency(discount)})
              </span>
            )}
          </span>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(total(DELIVERY_FEE))}
          </span>
        </div>
        <motion.button
          onClick={handleCheckout}
          disabled={placing}
          whileTap={{ scale: 0.98 }}
          className="btn-primary w-full py-3.5 text-base"
        >
          {placing ? (
            "⟳ Placing order…"
          ) : (
            <>
              <ShoppingBag size={18} />
              Place Order
            </>
          )}
        </motion.button>
        <p className="text-xs text-center text-gray-400 mt-1.5">
          🎮 You'll earn XP for this order!
        </p>
      </div>
    </div>
  );
}
