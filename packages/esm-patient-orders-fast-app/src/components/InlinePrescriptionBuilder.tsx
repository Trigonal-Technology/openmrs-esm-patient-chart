import React, { useCallback, useEffect, useState } from 'react';
import { Send, Reset } from '@carbon/react/icons';
import { Button } from '@carbon/react';
import { parsePrescription, drugSearchResultToFastDrug } from '../lib/prescriptionParser';
import type { ParsedPrescription } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { InlineOrderRow, type OrderRow } from './InlineOrderRow';
import { NlpInput } from './NlpInput';
import { QuickTemplates } from './QuickTemplates';
import { useDrugSearch } from '../resources/drug-search.resource';
import { calculateAutoQuantity } from '../lib/quantityCalculator';
import styles from './inline-prescription-builder.scss';

interface InlinePrescriptionBuilderProps {
  patientUuid: string;
  orderConfig: OrderConfigObject;
  orderEncounterType: string;
  orderLocationUuid: string;
  ordererUuid: string;
  visitUuid?: string;
  mutateOrders: () => void;
  drugOrderTypeUuid?: string;
  cart: OrderRow[];
  addToCart: (row: OrderRow) => void;
  updateRow: (id: string, updates: Partial<OrderRow>) => void;
  removeRow: (id: string) => void;
  clearCart: () => void;
  nextId: () => string;
  onSubmitAll: () => void;
  isSubmittingCart: boolean;
}

export function InlinePrescriptionBuilder({
  patientUuid,
  orderConfig,
  orderLocationUuid,
  ordererUuid,
  visitUuid,
  mutateOrders,
  drugOrderTypeUuid,
  cart,
  addToCart,
  updateRow,
  removeRow,
  clearCart,
  nextId,
  onSubmitAll,
  isSubmittingCart,
}: InlinePrescriptionBuilderProps) {
  const [templateToParse, setTemplateToParse] = useState<string | null>(null);

  const drugSearchTerm = templateToParse ? templateToParse.split(/\s+/)[0] ?? '' : '';
  const { drugs: templateDrugs } = useDrugSearch(drugSearchTerm);

  const addFromParsed = useCallback(
    (parsed: ParsedPrescription) => {
      const defaultDose = orderConfig.drugDosingUnits[0]?.valueCoded ?? '';
      const defaultRoute = orderConfig.drugRoutes.find((r) => (r as { value?: string }).value?.toLowerCase() === 'oral')?.valueCoded ?? orderConfig.drugRoutes[0]?.valueCoded ?? '';
      const defaultFreq =
        orderConfig.orderFrequencies[1]?.valueCoded ?? orderConfig.orderFrequencies[0]?.valueCoded ?? '';
      const defaultDur = orderConfig.durationUnits[0]?.valueCoded ?? '';

      const dose = parsed.dose;
      const freq = parsed.frequency ?? defaultFreq;
      const dur = parsed.duration;
      const durUnits = parsed.durationUnits ?? defaultDur;
      const autoQty = calculateAutoQuantity(dose, freq, dur, durUnits, orderConfig);

      const newRow: OrderRow = {
        id: nextId(),
        drug: parsed.drug,
        dose: dose,
        doseUnits: parsed.doseUnits ?? parsed.drug?.defaultDoseUnit ?? defaultDose,
        route: parsed.route ?? parsed.drug?.defaultRoute ?? defaultRoute,
        frequency: freq,
        duration: dur,
        durationUnits: durUnits,
        asNeeded: parsed.asNeeded,
        numRefills: 0,
        quantity: autoQty,
      };
      addToCart(newRow);
    },
    [orderConfig, addToCart, nextId],
  );

  useEffect(() => {
    if (templateToParse && templateDrugs.length > 0) {
      const defaultDose = orderConfig.drugDosingUnits[0]?.valueCoded ?? '';
      const defaultRoute = orderConfig.drugRoutes.find((r) => (r as { value?: string }).value?.toLowerCase() === 'oral')?.valueCoded ?? orderConfig.drugRoutes[0]?.valueCoded ?? '';

      const drug = drugSearchResultToFastDrug(templateDrugs[0], defaultDose, defaultRoute);
      if (drug) {
        const parsed = parsePrescription(templateToParse, [drug], orderConfig);
        parsed.drug = drug;
        addFromParsed(parsed);
        setTemplateToParse(null);
      }
    }
  }, [templateToParse, templateDrugs, orderConfig, addFromParsed]);

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <div className={styles.nlpRow}>
          <NlpInput onParsed={addFromParsed} orderConfig={orderConfig} />
          <div className={styles.actions}>
            <Button
              kind="ghost"
              size="md"
              onClick={clearCart}
              disabled={cart.length === 0}
              renderIcon={Reset}
              className={styles.resetBtn}
            >
              Clear cart
            </Button>
            <Button
              kind="primary"
              size="md"
              onClick={onSubmitAll}
              disabled={cart.length === 0 || isSubmittingCart}
              renderIcon={Send}
              className={styles.submitBtn}
            >
              {isSubmittingCart ? 'Submitting...' : 'Submit all'}
            </Button>
          </div>
        </div>
        <QuickTemplates onSelect={setTemplateToParse} />
      </div>

      <div className={styles.basketSection}>
        <div className={styles.basketList}>
          {cart.map((row, index) => (
            <InlineOrderRow
              key={row.id}
              row={row}
              index={index}
              orderConfig={orderConfig}
              onChange={updateRow}
              onRemove={removeRow}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
