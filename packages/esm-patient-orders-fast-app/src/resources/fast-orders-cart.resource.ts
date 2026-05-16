import { BehaviorSubject } from 'rxjs';
import { useCallback, useEffect, useState } from 'react';
import type { OrderRow } from '../components/InlineOrderRow';

let cartIdCounter = 0;
const nextCartId = () => `cart-${++cartIdCounter}`;

const cartSubject = new BehaviorSubject<OrderRow[]>([]);

export const cart$ = cartSubject.asObservable();

export function useFastOrdersCart() {
  const [cart, setCart] = useState<OrderRow[]>(cartSubject.value);

  useEffect(() => {
    const subscription = cart$.subscribe(setCart);
    return () => subscription.unsubscribe();
  }, []);

  const addToCart = useCallback((row: OrderRow) => {
    const id = row.id || nextCartId();
    cartSubject.next([{ ...row, id }, ...cartSubject.value]);
  }, []);

  const updateCartItem = useCallback((id: string, updates: Partial<OrderRow>) => {
    cartSubject.next(cartSubject.value.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    cartSubject.next(cartSubject.value.filter((r) => r.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    cartSubject.next([]);
  }, []);

  return {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    nextId: nextCartId,
  };
}
