import { BehaviorSubject } from 'rxjs';
import { useCallback, useEffect, useState } from 'react';
import type { DrugOrderItem, OrderSet } from './orderset-config';

let drugIdCounter = 0;
const nextDrugId = () => `drug-${++drugIdCounter}`;

interface OrdersetCartState {
  selectedSet: OrderSet | null;
  drugs: DrugOrderItem[];
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
    const drugs = set ? set.drugs.map((d) => ({ ...d, id: `${d.id}-${Date.now()}` })) : [];
    cartSubject.next({
      ...cartSubject.value,
      selectedSet: set,
      drugs,
    });
  }, []);

  const setDrugs = useCallback((drugs: DrugOrderItem[]) => {
    cartSubject.next({
      ...cartSubject.value,
      drugs,
    });
  }, []);

  const updateDrug = useCallback((id: string, updates: Partial<DrugOrderItem>) => {
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

  const addDrug = useCallback((drug: Omit<DrugOrderItem, 'id'>) => {
    const newDrug: DrugOrderItem = {
      ...drug,
      id: nextDrugId(),
    };
    cartSubject.next({
      ...cartSubject.value,
      drugs: [...cartSubject.value.drugs, newDrug],
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
    nextDrugId,
  };
}
