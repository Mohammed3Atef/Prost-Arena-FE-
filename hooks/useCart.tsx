'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import api from '../services/api/client';
import { useAuthStore } from '../store/useAuthStore';

export interface CartItem {
  lineId:      string;
  menuItem:    string;
  name:        string;
  price:       number;
  quantity:    number;
  addOns:      { name: string; price: number }[];
  specialNote: string;
  image:       string | null;
}

export interface ServerCart {
  items:        CartItem[];
  couponCode:   string | null;
  userRewardId: string | null;
  discount:     number;
}

interface CartContextValue {
  cart:         ServerCart;
  isLoading:    boolean;
  isReady:      boolean;
  refresh:      () => Promise<void>;
  addItem:      (input: { menuItem: string; quantity?: number; addOns?: { name: string; price: number }[]; specialNote?: string }) => Promise<void>;
  setQuantity:  (lineId: string, quantity: number) => Promise<void>;
  removeItem:   (lineId: string) => Promise<void>;
  clearCart:    () => Promise<void>;
  applyCoupon:  (code: string) => Promise<void>;
  applyReward:  (userRewardId: string) => Promise<void>;
  removeCoupon: () => Promise<void>;

  // computed
  itemCount:    () => number;
  subtotal:     () => number;
  total:        (deliveryFee?: number) => number;

  // helper for components: find a line for a given menuItemId (no addOns variant)
  lineFor:      (menuItemId: string) => CartItem | undefined;
}

const EMPTY: ServerCart = { items: [], couponCode: null, userRewardId: null, discount: 0 };
const CartContext = createContext<CartContextValue | null>(null);

function adapt(raw: any): ServerCart {
  if (!raw) return EMPTY;
  return {
    items: (raw.items ?? []).map((i: any) => ({
      lineId:      i.lineId,
      menuItem:    typeof i.menuItem === 'object' ? i.menuItem._id : i.menuItem,
      name:        i.name,
      price:       i.price,
      quantity:    i.quantity,
      addOns:      i.addOns ?? [],
      specialNote: i.specialNote ?? '',
      image:       i.image ?? null,
    })),
    couponCode:   raw.couponCode ?? null,
    userRewardId: raw.userRewardId ?? null,
    discount:     raw.discount ?? 0,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isHydrated } = useAuthStore();
  const [cart, setCart] = useState<ServerCart>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setCart(EMPTY); setIsReady(true); return; }
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setIsLoading(true);
    try {
      const { data } = await api.get('/cart', { signal: ctrl.signal });
      setCart(adapt(data.data ?? data));
    } catch {
      /* ignore — keep last known state */
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [user]);

  // Refetch when auth state changes
  useEffect(() => {
    if (!isHydrated) return;
    refresh();
  }, [isHydrated, user?._id, refresh]);

  const addItem: CartContextValue['addItem'] = useCallback(async (input) => {
    if (!user) {
      // Logged-out users can't add to server cart; let caller decide where to redirect.
      throw Object.assign(new Error('Login required'), { code: 'AUTH_REQUIRED' });
    }
    const { data } = await api.post('/cart/items', {
      menuItem:    input.menuItem,
      quantity:    input.quantity ?? 1,
      addOns:      input.addOns ?? [],
      specialNote: input.specialNote ?? '',
    });
    setCart(adapt(data.data ?? data));
  }, [user]);

  const setQuantity: CartContextValue['setQuantity'] = useCallback(async (lineId, quantity) => {
    if (!user) return;
    const { data } = await api.patch(`/cart/items/${encodeURIComponent(lineId)}`, { quantity });
    setCart(adapt(data.data ?? data));
  }, [user]);

  const removeItem: CartContextValue['removeItem'] = useCallback(async (lineId) => {
    if (!user) return;
    const { data } = await api.delete(`/cart/items/${encodeURIComponent(lineId)}`);
    setCart(adapt(data.data ?? data));
  }, [user]);

  const clearCart: CartContextValue['clearCart'] = useCallback(async () => {
    if (!user) return;
    const { data } = await api.delete('/cart');
    setCart(adapt(data.data ?? data));
  }, [user]);

  const applyCoupon: CartContextValue['applyCoupon'] = useCallback(async (code) => {
    const { data } = await api.post('/cart/coupon', { code });
    setCart(adapt(data.data ?? data));
  }, []);

  const applyReward: CartContextValue['applyReward'] = useCallback(async (userRewardId) => {
    const { data } = await api.post('/cart/coupon', { userRewardId });
    setCart(adapt(data.data ?? data));
  }, []);

  const removeCoupon: CartContextValue['removeCoupon'] = useCallback(async () => {
    const { data } = await api.delete('/cart/coupon');
    setCart(adapt(data.data ?? data));
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    cart, isLoading, isReady, refresh,
    addItem, setQuantity, removeItem, clearCart,
    applyCoupon, applyReward, removeCoupon,
    itemCount:  () => cart.items.reduce((s, i) => s + i.quantity, 0),
    subtotal:   () => cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
    total:      (deliveryFee = 0) => Math.max(
      0,
      cart.items.reduce((s, i) => s + i.price * i.quantity, 0) - cart.discount + deliveryFee,
    ),
    lineFor:    (menuItemId) => cart.items.find((i) => i.menuItem === menuItemId && (i.addOns?.length ?? 0) === 0),
  }), [cart, isLoading, isReady, refresh, addItem, setQuantity, removeItem, clearCart, applyCoupon, applyReward, removeCoupon]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
