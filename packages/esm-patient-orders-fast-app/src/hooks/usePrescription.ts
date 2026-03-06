import { useState, useMemo, useCallback } from 'react';
import type { FastDrug } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import type { OrderRow } from '../components/InlineOrderRow';

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
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectDrug = useCallback((drug: FastDrug) => {
    setState((prev) => ({
      ...prev,
      drug,
      dose: drug.commonDoses[0] ?? null,
      doseUnits: drug.defaultDoseUnit,
      route: drug.defaultRoute,
    }));
  }, []);

  const getTimesPerDay = useCallback(
    (freqValue: string) => {
      const f = orderConfig.orderFrequencies.find((x) => x.valueCoded === freqValue);
      const v = (f as { value?: string })?.value?.toLowerCase() ?? '';
      if (v.includes('once') || v.includes('od')) return 1;
      if (v.includes('twice') || v.includes('bid')) return 2;
      if (v.includes('three') || v.includes('tid')) return 3;
      if (v.includes('four') || v.includes('qid')) return 4;
      return 1;
    },
    [orderConfig],
  );

  const getDurationDays = useCallback(
    (duration: number, durationUnits: string) => {
      const u = orderConfig.durationUnits.find((x) => x.valueCoded === durationUnits);
      const v = (u as { value?: string })?.value?.toLowerCase() ?? '';
      if (v.includes('week')) return duration * 7;
      if (v.includes('month')) return duration * 30;
      return duration;
    },
    [orderConfig],
  );

  const autoQuantity = useMemo(() => {
    if (!state.dose || !state.duration) return null;
    const timesPerDay = getTimesPerDay(state.frequency);
    const days = getDurationDays(state.duration, state.durationUnits);
    return Math.ceil(timesPerDay * days);
  }, [state.dose, state.duration, state.frequency, state.durationUnits, getTimesPerDay, getDurationDays]);

  const prescriptionSummary = useMemo(() => {
    if (!state.drug) return '';
    const doseUnit = orderConfig.drugDosingUnits.find((u) => u.valueCoded === state.doseUnits);
    const route = orderConfig.drugRoutes.find((r) => r.valueCoded === state.route);
    const freq = orderConfig.orderFrequencies.find((f) => f.valueCoded === state.frequency);
    const durUnit = orderConfig.durationUnits.find((u) => u.valueCoded === state.durationUnits);

    let summary = state.drug.name;
    if (state.dose) summary += ` ${state.dose} ${doseUnit?.value ?? ''}`;
    if (route) summary += ` ${route.value}`;
    if (freq) summary += ` ${(freq as { value?: string }).value ?? ''}`;
    if (state.duration && durUnit) summary += ` × ${state.duration} ${durUnit.value}`;
    if (state.asNeeded) summary += ' PRN';
    if (state.asNeededCondition) summary += ` (${state.asNeededCondition})`;
    return summary;
  }, [state, orderConfig]);

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
      numRefills: 0,
      quantity: row.quantity,
      quantityUnits: row.doseUnits,
      dosingInstructions: '',
      orderReason: '',
    });
  }, []);

  return { state, update, selectDrug, autoQuantity, prescriptionSummary, isValid, toPayload, reset, loadFromOrderRow };
}
