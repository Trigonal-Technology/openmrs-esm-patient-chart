import { useState, useMemo, useCallback } from 'react';
import type { FastDrug } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import type { OrderRow } from '../components/InlineOrderRow';
import { calculateAutoQuantity } from '../lib/quantityCalculator';

export interface PrescriptionState {
  drug: FastDrug | null;
  dose: number | null;
  doseUnits: string;
  route: string;
  frequency: string;
  duration: number | null;
  durationUnits: string;
  asNeeded: boolean;
  asNeededCondition: string;
  numRefills: number;
  quantity: number | null;
  quantityUnits: string;
  dosingInstructions: string;
  orderReason: string;
}

export function usePrescription(orderConfig: OrderConfigObject) {
  const defaultDoseUnit = orderConfig.drugDosingUnits[0]?.valueCoded ?? '';
  const defaultRoute = orderConfig.drugRoutes[0]?.valueCoded ?? '';
  const defaultFreq = orderConfig.orderFrequencies[1]?.valueCoded ?? orderConfig.orderFrequencies[0]?.valueCoded ?? '';
  const defaultDurationUnit = orderConfig.durationUnits[0]?.valueCoded ?? '';

  const [state, setState] = useState<PrescriptionState>({
    drug: null,
    dose: null,
    doseUnits: defaultDoseUnit,
    route: defaultRoute,
    frequency: defaultFreq,
    duration: null,
    durationUnits: defaultDurationUnit,
    asNeeded: false,
    asNeededCondition: '',
    numRefills: 0,
    quantity: null,
    quantityUnits: defaultDoseUnit,
    dosingInstructions: '',
    orderReason: '',
  });

  const update = useCallback(<K extends keyof PrescriptionState>(key: K, value: PrescriptionState[K]) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'doseUnits') {
        if (prev.quantityUnits === prev.doseUnits || !prev.quantityUnits) {
          next.quantityUnits = value as string;
        }
      }
      return next;
    });
  }, []);

  const selectDrug = useCallback((drug: FastDrug) => {
    setState((prev) => ({
      ...prev,
      drug,
      dose: drug.commonDoses[0] ?? null,
      doseUnits: drug.defaultDoseUnit || defaultDoseUnit,
      route: drug.defaultRoute || defaultRoute,
      quantityUnits: drug.defaultDoseUnit || defaultDoseUnit,
    }));
  }, [defaultDoseUnit, defaultRoute]);

  const autoQuantity = useMemo(() => {
    return calculateAutoQuantity(state.dose, state.frequency, state.duration, state.durationUnits, orderConfig);
  }, [state.dose, state.duration, state.frequency, state.durationUnits, orderConfig]);

  const prescriptionSummary = useMemo(() => {
    if (!state.drug) return '';
    const doseUnit = orderConfig.drugDosingUnits.find((u) => u.valueCoded === state.doseUnits);
    const route = orderConfig.drugRoutes.find((r) => r.valueCoded === state.route);
    const freq = orderConfig.orderFrequencies.find((f) => f.valueCoded === state.frequency);
    const durUnit = orderConfig.durationUnits.find((u) => u.valueCoded === state.durationUnits);

    let summary = state.drug.name;
    if (state.dose) summary += ` ${state.dose} ${doseUnit?.value ?? ''}`;
    if (route) summary += ` — ${route.value}`;
    if (freq) summary += ` — ${(freq as { value?: string }).value ?? ''}`;
    if (state.duration && durUnit) summary += ` — ${state.duration} ${durUnit.value}`;
    if (state.quantity || autoQuantity) {
      summary += ` — QUANTITY ${state.quantity ?? autoQuantity} ${doseUnit?.value ?? ''}`;
    }
    return summary;
  }, [state, autoQuantity, orderConfig]);

  const isValid = useMemo(
    () => !!(state.drug && state.dose && state.dose > 0 && state.duration && state.duration > 0),
    [state.drug, state.dose, state.duration],
  );

  const toPayload = useCallback(() => {
    if (!state.drug) return null;
    const qty = state.quantity ?? autoQuantity ?? 0;
    return {
      drugUuid: state.drug.uuid,
      conceptUuid: state.drug.concept,
      dose: state.dose!,
      doseUnits: state.doseUnits,
      route: state.route,
      frequency: state.frequency,
      asNeeded: state.asNeeded,
      asNeededCondition: state.asNeededCondition,
      quantity: qty,
      quantityUnits: state.quantityUnits,
      duration: state.duration!,
      durationUnits: state.durationUnits,
      dosingInstructions: state.dosingInstructions,
      orderReasonNonCoded: state.orderReason,
    };
  }, [state, autoQuantity]);

  const reset = useCallback(() => {
    setState({
      drug: null,
      dose: null,
      doseUnits: defaultDoseUnit,
      route: defaultRoute,
      frequency: defaultFreq,
      duration: null,
      durationUnits: defaultDurationUnit,
      asNeeded: false,
      asNeededCondition: '',
      numRefills: 0,
      quantity: null,
      quantityUnits: defaultDoseUnit,
      dosingInstructions: '',
      orderReason: '',
    });
  }, [defaultDoseUnit, defaultRoute, defaultFreq, defaultDurationUnit]);

  const loadFromOrderRow = useCallback((row: OrderRow) => {
    if (!row.drug) return;
    setState({
      drug: row.drug,
      dose: row.dose,
      doseUnits: row.doseUnits,
      route: row.route,
      frequency: row.frequency,
      duration: row.duration,
      durationUnits: row.durationUnits,
      asNeeded: row.asNeeded,
      asNeededCondition: '',
      numRefills: row.numRefills,
      quantity: row.quantity,
      quantityUnits: row.doseUnits,
      dosingInstructions: '',
      orderReason: '',
    });
  }, []);

  return { state, update, selectDrug, autoQuantity, prescriptionSummary, isValid, toPayload, reset, loadFromOrderRow };
}
