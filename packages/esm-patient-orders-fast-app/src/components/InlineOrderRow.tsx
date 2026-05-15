import React, { useMemo } from 'react';
import { Close } from '@carbon/react/icons';
import { Select, SelectItem } from '@carbon/react';
import type { FastDrug } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { calculateAutoQuantity } from '../lib/quantityCalculator';
import styles from './inline-order-row.scss';

export interface OrderRow {
  id: string;
  drug: FastDrug | null;
  dose: number | null;
  doseUnits: string;
  route: string;
  frequency: string;
  duration: number | null;
  durationUnits: string;
  asNeeded: boolean;
  numRefills: number;
  quantity: number | null;
}

interface InlineOrderRowProps {
  row: OrderRow;
  onChange: (id: string, updates: Partial<OrderRow>) => void;
  onRemove: (id: string) => void;
  index: number;
  orderConfig: OrderConfigObject;
}

export function InlineOrderRow({ row, onChange, onRemove, orderConfig }: InlineOrderRowProps) {
  const autoQty = useMemo(() => {
    return calculateAutoQuantity(row.dose, row.frequency, row.duration, row.durationUnits, orderConfig);
  }, [row.dose, row.duration, row.frequency, row.durationUnits, orderConfig]);

  const isValid = !!(row.drug && row.dose && row.dose > 0 && row.duration && row.duration > 0);

  const handleFieldChange = (updates: Partial<OrderRow>) => {
    const updatedRow = { ...row, ...updates };
    const newAutoQty = calculateAutoQuantity(
      updatedRow.dose,
      updatedRow.frequency,
      updatedRow.duration,
      updatedRow.durationUnits,
      orderConfig,
    );
    onChange(row.id, { ...updates, quantity: newAutoQty });
  };

  return (
    <div className={`${styles.row} ${!isValid ? styles.invalid : ''}`}>
      <div className={styles.header}>
        <span className={styles.drugName}>
          {row.drug?.name ?? 'Unknown drug'}
          {row.asNeeded && <span className={styles.prnTag}>PRN</span>}
        </span>
        <button type="button" onClick={() => onRemove(row.id)} className={styles.removeBtn} aria-label="Remove order">
          <Close size={16} />
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <span className={styles.label}>Dose</span>
          <div className={styles.inputGroup}>
            <input
              type="number"
              value={row.dose ?? ''}
              onChange={(e) => handleFieldChange({ dose: e.target.value ? Number(e.target.value) : null })}
              placeholder="Dose"
              className={styles.input}
            />
            <Select
              id={`dose-units-${row.id}`}
              hideLabel
              labelText="unit"
              value={row.doseUnits}
              onChange={(e) => handleFieldChange({ doseUnits: e.target.value })}
              size="sm"
              className={styles.select}
            >
              {orderConfig.drugDosingUnits.map((u) => (
                <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
              ))}
            </Select>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Route</span>
          <Select
            id={`route-${row.id}`}
            hideLabel
            labelText="route"
            value={row.route}
            onChange={(e) => handleFieldChange({ route: e.target.value })}
            size="sm"
            className={styles.select}
          >
            {orderConfig.drugRoutes.map((r) => (
              <SelectItem key={r.valueCoded} value={r.valueCoded} text={r.value} />
            ))}
          </Select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Frequency</span>
          <Select
            id={`freq-${row.id}`}
            hideLabel
            labelText="frequency"
            value={row.frequency}
            onChange={(e) => handleFieldChange({ frequency: e.target.value })}
            size="sm"
            className={styles.select}
          >
            {orderConfig.orderFrequencies.map((f) => (
              <SelectItem key={f.valueCoded} value={f.valueCoded} text={(f as { value?: string }).value ?? ''} />
            ))}
          </Select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Duration</span>
          <div className={styles.inputGroup}>
            <input
              type="number"
              value={row.duration ?? ''}
              onChange={(e) => handleFieldChange({ duration: e.target.value ? Number(e.target.value) : null })}
              placeholder="Dur"
              min={1}
              className={styles.input}
            />
            <Select
              id={`dur-units-${row.id}`}
              hideLabel
              labelText="unit"
              value={row.durationUnits}
              onChange={(e) => handleFieldChange({ durationUnits: e.target.value })}
              size="sm"
              className={styles.select}
            >
              {orderConfig.durationUnits.map((u) => (
                <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
              ))}
            </Select>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>QTY</span>
          <div className={styles.qtyValue}>{row.quantity ? `${row.quantity}` : (autoQty ? `${autoQty}` : '—')}</div>
        </div>
      </div>
    </div>
  );
}
