import React, { useCallback, useEffect, useState } from 'react';
import { Send, Reset } from '@carbon/react/icons';
import { Button } from '@carbon/react';
import { parsePrescription, drugSearchResultToFastDrug } from '../lib/prescriptionParser';
import type { ParsedPrescription } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { InlineOrderRow, type OrderRow } from './InlineOrderRow';
import { NlpInput } from './NlpInput';
import { QuickTemplates } from './QuickTemplates';
import { OrdersTable } from './OrdersTable';
import { useDrugSearch } from '../resources/drug-search.resource';
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
      const defaultRoute = orderConfig.drugRoutes[0]?.valueCoded ?? '';
      const defaultFreq =
        orderConfig.orderFrequencies[1]?.valueCoded ?? orderConfig.orderFrequencies[0]?.valueCoded ?? '';
      const defaultDur = orderConfig.durationUnits[0]?.valueCoded ?? '';

      const newRow: OrderRow = {
        id: nextId(),
        drug: parsed.drug,
        dose: parsed.dose,
        doseUnits: parsed.doseUnits ?? parsed.drug?.defaultDoseUnit ?? defaultDose,
        route: parsed.route ?? parsed.drug?.defaultRoute ?? defaultRoute,
        frequency: parsed.frequency ?? defaultFreq,
        duration: parsed.duration,
        durationUnits: parsed.durationUnits ?? defaultDur,
        asNeeded: parsed.asNeeded,
        quantity: null,
      };
      addToCart(newRow);
    },
    [orderConfig, addToCart, nextId],
  );

  useEffect(() => {
    if (templateToParse && templateDrugs.length > 0) {
      const fastDrugs = templateDrugs.map((d) =>
        drugSearchResultToFastDrug(
          d,
          orderConfig.drugDosingUnits[0]?.valueCoded ?? '',
          orderConfig.drugRoutes[0]?.valueCoded ?? '',
        ),
      );
      const parsed = parsePrescription(templateToParse, fastDrugs, orderConfig);
      addFromParsed(parsed);
      setTemplateToParse(null);
    }
  }, [templateToParse, templateDrugs, orderConfig, addFromParsed]);

  const validRows = cart.filter((r) => r.drug && r.dose && r.dose > 0 && r.duration && r.duration > 0);

  return (
    <div className={styles.container}>
      <div className={styles.basket}>
        <div className={styles.header}>
          <h2 className={styles.title}>Order Basket</h2>
          <span className={styles.badge}>
            {cart.length} item{cart.length !== 1 ? 's' : ''}
          </span>
          {cart.length > 0 && (
            <Button kind="ghost" size="sm" onClick={clearCart} renderIcon={Reset}>
              Clear all
            </Button>
          )}
        </div>

        <QuickTemplates onSelect={(rx) => setTemplateToParse(rx)} />

        <NlpInput onParsed={addFromParsed} orderConfig={orderConfig} />

        <div className={styles.rows}>
          {cart.map((row) => (
            <InlineOrderRow
              key={row.id}
              row={row}
              onChange={updateRow}
              onRemove={removeRow}
              index={cart.indexOf(row)}
              orderConfig={orderConfig}
            />
          ))}
          {cart.length === 0 && (
            <div className={styles.empty}>
              <p>No orders in basket</p>
              <p className={styles.emptyHint}>
                Use the search bar or templates above to add prescriptions. Items appear in the cart on the right.
              </p>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <span className={styles.validCount}>
              <strong>{validRows.length}</strong> of {cart.length} orders valid
            </span>
            <Button
              kind="primary"
              size="md"
              onClick={onSubmitAll}
              disabled={validRows.length === 0 || isSubmittingCart}
              renderIcon={Send}
            >
              {isSubmittingCart ? 'Submitting…' : `Sign and place ${validRows.length} order(s)`}
            </Button>
          </div>
        )}
      </div>

      <OrdersTable patientUuid={patientUuid} orderConfig={orderConfig} drugOrderTypeUuid={drugOrderTypeUuid} />
    </div>
  );
}
