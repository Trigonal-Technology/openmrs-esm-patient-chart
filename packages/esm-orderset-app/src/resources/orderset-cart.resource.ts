import { BehaviorSubject } from 'rxjs';
import { useCallback, useEffect, useState } from 'react';
import type { OrderItem, OrderSet } from './orderset-config';

let itemIdCounter = 0;
const nextItemId = () => `item-${++itemIdCounter}`;

interface OrdersetCartState {
  selectedSet: OrderSet | null;
  drugs: OrderItem[]; // Keeping the state name 'drugs' for now to match dashboard usage
  customSets: OrderSet[];
}

const initialState: OrdersetCartState = {
  selectedSet: null,
  drugs: [],
  customSets: [],
};

const cartSubject = new BehaviorSubject<OrdersetCartState>(initialState);

export const ordersetCart$ = cartSubject.asObservable();

export function useOrdersetCart() {
  const [state, setState] = useState<OrdersetCartState>(cartSubject.value);

  useEffect(() => {
    const subscription = ordersetCart$.subscribe(setState);
    return () => subscription.unsubscribe();
  }, []);

  const selectSet = useCallback((set: OrderSet | null) => {
    const members = set ? set.members.map((m) => ({ ...m })) : [];
    cartSubject.next({
      ...cartSubject.value,
      selectedSet: set,
      drugs: members,
    });
  }, []);

  const setDrugs = useCallback((drugs: OrderItem[]) => {
    cartSubject.next({
      ...cartSubject.value,
      drugs,
    });
  }, []);

  const updateDrug = useCallback((id: string, updates: Partial<OrderItem>) => {
    cartSubject.next({
      ...cartSubject.value,
      drugs: cartSubject.value.drugs.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    });
  }, []);

  const removeDrug = useCallback((id: string) => {
    cartSubject.next({
      ...cartSubject.value,
      drugs: cartSubject.value.drugs.filter((d) => d.id !== id),
    });
  }, []);

  const addDrug = useCallback((item: Omit<OrderItem, 'id'>) => {
    const newItem: OrderItem = {
      ...item,
      id: nextItemId(),
    };
    cartSubject.next({
      ...cartSubject.value,
      drugs: [...cartSubject.value.drugs, newItem],
    });
  }, []);

  const addCustomSet = useCallback((set: OrderSet) => {
    cartSubject.next({
      ...cartSubject.value,
      customSets: [...cartSubject.value.customSets, set],
    });
  }, []);

  const removeCustomSet = useCallback((setId: string) => {
    cartSubject.next({
      ...cartSubject.value,
      customSets: cartSubject.value.customSets.filter((s) => s.id !== setId),
      selectedSet:
        cartSubject.value.selectedSet?.id === setId ? null : cartSubject.value.selectedSet,
      drugs: cartSubject.value.selectedSet?.id === setId ? [] : cartSubject.value.drugs,
    });
  }, []);

  const clearSelection = useCallback(() => {
    cartSubject.next({
      ...cartSubject.value,
      selectedSet: null,
      drugs: [],
    });
  }, []);

  return {
    selectedSet: state.selectedSet,
    drugs: state.drugs,
    customSets: state.customSets,
    selectSet,
    setDrugs,
    updateDrug,
    removeDrug,
    addDrug,
    addCustomSet,
    removeCustomSet,
    clearSelection,
    nextItemId,
  };
}

