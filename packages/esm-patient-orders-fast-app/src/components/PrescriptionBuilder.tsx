import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Reset, Checkmark, ChevronDown, ChevronUp } from '@carbon/react/icons';
import { Button, Toggle } from '@carbon/react';
import { usePrescription } from '../hooks/usePrescription';
import { drugSearchResultToFastDrug } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import type { OrderRow } from './InlineOrderRow';
import { DrugSearch } from './DrugSearch';
import { ChipSelect } from './ChipSelect';
import { CompactField, NumberInput } from './CompactField';
import { PrescriptionPreview } from './PrescriptionPreview';
import { submitOrdersOnNewEncounter } from '../resources/order-api';
import { showSnackbar } from '@openmrs/esm-framework';
import { invalidateVisitAndEncounterData } from '@openmrs/esm-patient-common-lib';
import { useSWRConfig } from 'swr';
import styles from './prescription-builder.scss';

interface PrescriptionBuilderProps {
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
  updateCartItem: (id: string, updates: Partial<OrderRow>) => void;
  editingCartId: string | null;
  onClearEditing: () => void;
  onEditCartItem: (id: string) => void;
}

export function PrescriptionBuilder({
  patientUuid,
  orderConfig,
  orderEncounterType,
  orderLocationUuid,
  ordererUuid,
  visitUuid,
  mutateOrders,
  cart,
  addToCart,
  updateCartItem,
  editingCartId,
  onClearEditing,
}: PrescriptionBuilderProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();

  const { state, update, selectDrug, autoQuantity, prescriptionSummary, isValid, toPayload, reset, loadFromOrderRow } =
    usePrescription(orderConfig);
  const lastLoadedCartIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingCartId && editingCartId !== lastLoadedCartIdRef.current) {
      const row = cart.find((r) => r.id === editingCartId);
      if (row) {
        loadFromOrderRow(row);
        lastLoadedCartIdRef.current = editingCartId;
      }
    }
    if (!editingCartId) lastLoadedCartIdRef.current = null;
  }, [editingCartId, cart, loadFromOrderRow]);

  const stateToOrderRow = useCallback((): Partial<OrderRow> => {
    return {
      drug: state.drug,
      dose: state.dose,
      doseUnits: state.doseUnits,
      route: state.route,
      frequency: state.frequency,
      duration: state.duration,
      durationUnits: state.durationUnits,
      asNeeded: state.asNeeded,
      quantity: state.quantity ?? autoQuantity ?? null,
    };
  }, [state, autoQuantity]);

  const handleAddToCart = useCallback(() => {
    if (!isValid) return;
    addToCart({
      id: '',
      drug: state.drug!,
      dose: state.dose!,
      doseUnits: state.doseUnits,
      route: state.route,
      frequency: state.frequency,
      duration: state.duration!,
      durationUnits: state.durationUnits,
      asNeeded: state.asNeeded,
      quantity: state.quantity ?? autoQuantity ?? null,
    });
    reset();
  }, [isValid, state, autoQuantity, addToCart, reset]);

  const handleUpdateInCart = useCallback(() => {
    if (!editingCartId || !isValid) return;
    updateCartItem(editingCartId, stateToOrderRow() as Partial<OrderRow>);
    onClearEditing();
    reset();
  }, [editingCartId, isValid, updateCartItem, onClearEditing, reset, stateToOrderRow]);

  const defaultDoseUnit = orderConfig.drugDosingUnits[0]?.valueCoded ?? '';
  const defaultRoute = orderConfig.drugRoutes[0]?.valueCoded ?? '';

  const handleSubmit = async () => {
    if (!isValid) return;
    const payload = toPayload();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      await submitOrdersOnNewEncounter(
        [payload],
        patientUuid,
        ordererUuid,
        orderEncounterType,
        orderLocationUuid,
        visitUuid,
      );
      setSubmitted(true);
      reset();
      mutateOrders();
      invalidateVisitAndEncounterData(mutate, patientUuid);
      showSnackbar({
        kind: 'success',
        title: 'Order placed',
        subtitle: 'Drug order submitted successfully',
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (e) {
      showSnackbar({
        kind: 'error',
        title: 'Error placing order',
        subtitle: (e as Error)?.message ?? 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Drug Order Form</h2>
        </div>

        <div className={styles.content}>
          <CompactField label="Medication">
            <DrugSearch
              selectedDrug={state.drug}
              onSelect={selectDrug}
              onClear={reset}
              defaultDoseUnit={defaultDoseUnit}
              defaultRoute={defaultRoute}
              drugSearchResultToFastDrug={drugSearchResultToFastDrug}
            />
          </CompactField>

          {state.drug && (
            <div className={styles.form}>
              <div className={styles.doseRow}>
                <CompactField label="Dose">
                  <div className={styles.doseInputs}>
                    {state.drug.commonDoses.map((d) => (
                      <Button
                        key={d}
                        kind={state.dose === d ? 'primary' : 'tertiary'}
                        size="sm"
                        onClick={() => update('dose', d)}
                      >
                        {d}
                      </Button>
                    ))}
                    <NumberInput
                      value={state.dose}
                      onChange={(v) => update('dose', v)}
                      placeholder="Other"
                      className={styles.numberInput}
                    />
                  </div>
                </CompactField>
                <ChipSelect
                  label="Unit"
                  options={orderConfig.drugDosingUnits.map((u) => ({ value: u.valueCoded, label: u.value }))}
                  value={state.doseUnits}
                  onChange={(v) => update('doseUnits', v)}
                />
              </div>

              <ChipSelect
                label="Route"
                options={orderConfig.drugRoutes.map((r) => ({ value: r.valueCoded, label: r.value }))}
                value={state.route}
                onChange={(v) => update('route', v)}
              />

              <ChipSelect
                label="Frequency"
                options={orderConfig.orderFrequencies.map((f) => ({
                  value: f.valueCoded,
                  label: (f as { value?: string }).value ?? '',
                }))}
                value={state.frequency}
                onChange={(v) => update('frequency', v)}
              />

              <div className={styles.doseRow}>
                <CompactField label="Duration">
                  <NumberInput
                    value={state.duration}
                    onChange={(v) => update('duration', v)}
                    placeholder="e.g. 7"
                    min={1}
                  />
                </CompactField>
                <ChipSelect
                  label="Duration unit"
                  options={orderConfig.durationUnits.map((u) => ({ value: u.valueCoded, label: u.value }))}
                  value={state.durationUnits}
                  onChange={(v) => update('durationUnits', v)}
                />
              </div>

              {autoQuantity && (
                <div className={styles.autoQty}>
                  Auto-calculated quantity: <strong>{autoQuantity} doses</strong>
                </div>
              )}

              <PrescriptionPreview summary={prescriptionSummary} isValid={isValid} />

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className={styles.advancedToggle}>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAdvanced ? 'Hide' : 'Show'} additional options
              </button>

              {showAdvanced && (
                <div className={styles.advanced}>
                  <div className={styles.toggleRow}>
                    <Toggle
                      id="prn-toggle"
                      labelText="PRN (As Needed)"
                      toggled={state.asNeeded}
                      onToggle={(checked) => update('asNeeded', checked)}
                    />
                  </div>
                  {state.asNeeded && (
                    <CompactField label="PRN Condition">
                      <input
                        type="text"
                        value={state.asNeededCondition}
                        onChange={(e) => update('asNeededCondition', e.target.value)}
                        placeholder="e.g. for pain, for fever"
                        className={styles.textInput}
                      />
                    </CompactField>
                  )}
                  <div className={styles.doseRow}>
                    <CompactField label="Refills">
                      <NumberInput
                        value={state.numRefills}
                        onChange={(v) => update('numRefills', v ?? 0)}
                        placeholder="0"
                      />
                    </CompactField>
                    <CompactField label="Quantity (override)">
                      <NumberInput
                        value={state.quantity}
                        onChange={(v) => update('quantity', v)}
                        placeholder={autoQuantity ? String(autoQuantity) : '—'}
                      />
                    </CompactField>
                  </div>
                  <CompactField label="Dosing Instructions">
                    <textarea
                      value={state.dosingInstructions}
                      onChange={(e) => update('dosingInstructions', e.target.value)}
                      placeholder="e.g. take after food"
                      rows={2}
                      className={styles.textArea}
                    />
                  </CompactField>
                  <CompactField label="Indication / Reason">
                    <input
                      type="text"
                      value={state.orderReason}
                      onChange={(e) => update('orderReason', e.target.value)}
                      placeholder="e.g. fever, infection"
                      className={styles.textInput}
                    />
                  </CompactField>
                </div>
              )}

              <div className={styles.actions}>
                <Button
                  kind="primary"
                  size="md"
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting}
                  renderIcon={submitted ? Checkmark : Send}
                >
                  {isSubmitting ? 'Submitting…' : submitted ? 'Order Placed' : 'Sign and Place Order'}
                </Button>
                {editingCartId ? (
                  <Button kind="secondary" size="md" onClick={handleUpdateInCart} disabled={!isValid}>
                    Update in cart
                  </Button>
                ) : (
                  <Button kind="secondary" size="md" onClick={handleAddToCart} disabled={!isValid}>
                    Add to cart
                  </Button>
                )}
                <Button
                  kind="secondary"
                  size="md"
                  onClick={() => {
                    reset();
                    onClearEditing();
                  }}
                  renderIcon={Reset}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
