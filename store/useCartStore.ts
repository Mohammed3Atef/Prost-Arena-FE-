/**
 * Cart Store (Zustand)
 * Manages cart state — add, remove, update quantity.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id:          string;   // unique cart line id (menuItem._id + JSON(addOns))
  menuItemId:  string;
  name:        string;
  price:       number;
  quantity:    number;
  addOns:      { name: string; price: number }[];
  specialNote: string;
  image:       string | null;
  subtotal:    number;
}

interface CartState {
  items:         CartItem[];
  coupon:        string | null;   // coupon code (text entry)
  userRewardId:  string | null;   // UserReward._id (from spin wheel / challenge)
  discount:      number;

  addItem:          (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  removeItem:       (id: string) => void;
  updateQty:        (id: string, quantity: number) => void;
  clearCart:        () => void;
  applyCoupon:      (code: string, discount: number) => void;
  applyUserReward:  (userRewardId: string, discount: number) => void;
  removeCoupon:     () => void;

  // Computed
  subtotal:     () => number;
  total:        (deliveryFee?: number) => number;
  itemCount:    () => number;
}

const lineId = (menuItemId: string, addOns: { name: string }[]) =>
  `${menuItemId}-${addOns.map((a) => a.name).join('+')}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items:        [],
      coupon:       null,
      userRewardId: null,
      discount:     0,

      addItem: (item) => {
        const id = lineId(item.menuItemId, item.addOns);
        const existing = get().items.find((i) => i.id === id);

        if (existing) {
          set((s) => ({
            items: s.items.map((i) =>
              i.id === id
                ? { ...i, quantity: i.quantity + item.quantity, subtotal: (i.quantity + item.quantity) * i.price }
                : i,
            ),
          }));
        } else {
          const addOnTotal = item.addOns.reduce((sum, a) => sum + a.price, 0);
          const unitPrice  = item.price + addOnTotal;
          set((s) => ({
            items: [
              ...s.items,
              { ...item, id, price: unitPrice, subtotal: unitPrice * item.quantity },
            ],
          }));
        }
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQty: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return; }
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, quantity, subtotal: quantity * i.price } : i,
          ),
        }));
      },

      clearCart:       () => set({ items: [], coupon: null, userRewardId: null, discount: 0 }),
      applyCoupon:     (code, discount) => set({ coupon: code, userRewardId: null, discount }),
      applyUserReward: (userRewardId, discount) => set({ userRewardId, coupon: null, discount }),
      removeCoupon:    () => set({ coupon: null, userRewardId: null, discount: 0 }),

      subtotal:  () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
      total:     (deliveryFee = 0) => Math.max(0, get().subtotal() - get().discount + deliveryFee),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name:    'pa-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
