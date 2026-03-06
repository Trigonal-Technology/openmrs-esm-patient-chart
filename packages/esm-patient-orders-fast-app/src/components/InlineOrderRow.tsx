import React, { useMemo } from 'react';
import { Close } from '@carbon/react/icons';
import { Select, SelectItem } from '@carbon/react';
import type { FastDrug } from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
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
  quantity: number | null;
}

interface InlineOrderRowProps {
  row: OrderRow;
  onChange: (id: string, updates: Partial<OrderRow>) => void;
  onRemove: (id: string) => void;
  index: number;
  orderConfig: OrderConfigObject;
}

function getTimesPerDay(freqValue: string, orderConfig: OrderConfigObject): number {
  const f = orderConfig.orderFrequencies.find((x) => x.valueCoded === freqValue);
  const v = (f as { value?: string })?.value?.toLowerCase() ?? '';
  if (v.includes('once') || v.includes('od')) return 1;
  if (v.includes('twice') || v.includes('bid')) return 2;
  if (v.includes('three') || v.includes('tid')) return 3;
  if (v.includes('four') || v.includes('qid')) return 4;
  if (v.includes('every 4') || v.includes('q4h')) return 6;
  if (v.includes('every 6') || v.includes('q6h')) return 4;
  if (v.includes('every 8') || v.includes('q8h')) return 3;
  if (v.includes('every 12') || v.includes('q12h')) return 2;
  return 1;
}

function getDurationDays(duration: number, durationUnits: string, orderConfig: OrderConfigObject): number {
  const u = orderConfig.durationUnits.find((x) => x.valueCoded === durationUnits);
  const v = (u as { value?: string })?.value?.toLowerCase() ?? '';
  if (v.includes('week')) return duration * 7;
  if (v.includes('month')) return duration * 30;
  return duration;
}

export function InlineOrderRow({ row, onChange, onRemove, orderConfig }: InlineOrderRowProps) {
  const autoQty = useMemo(() => {
    if (!row.dose || !row.duration) return null;
    const timesPerDay = getTimesPerDay(row.frequency, orderConfig);
    const days = getDurationDays(row.duration, row.durationUnits, orderConfig);
    return Math.ceil(timesPerDay * days);
  }, [row.dose, row.duration, row.frequency, row.durationUnits, orderConfig]);

  const isValid = !!(row.drug && row.dose && row.dose > 0 && row.duration && row.duration > 0);

  const doseUnit = orderConfig.drugDosingUnits.find((u) => u.valueCoded === row.doseUnits);
  const route = orderConfig.drugRoutes.find((r) => r.valueCoded === row.route);
  const freq = orderConfig.orderFrequencies.find((f) => f.valueCoded === row.frequency);
  const durUnit = orderConfig.durationUnits.find((u) => u.valueCoded === row.durationUnits);

  return (
    <div className={`${styles.row} ${!isValid ? styles.invalid : ''}`}>
      <div className={styles.content}>
        <div className={styles.main}>
          <p className={styles.drugName}>
            {row.drug?.name ?? 'Unknown drug'}
            {row.asNeeded && <span className={styles.prnTag}>PRN</span>}
          </p>
          <p className={styles.details}>
            {row.dose != null && (
              <>
                <span className={styles.label}>DOSE</span> {row.dose} {doseUnit?.value ?? ''}
              </>
            )}
            {route && (
              <>
                {row.dose != null && <span className={styles.sep}> — </span>}
                {route.value.toLowerCase()}
              </>
            )}
            {freq && (
              <>
                <span className={styles.sep}> — </span>
                {(freq as { value?: string }).value?.toLowerCase() ?? ''}
              </>
            )}
            {row.duration != null && (
              <>
                <span className={styles.sep}> — </span>
                for {row.duration} {durUnit?.value?.toLowerCase() ?? ''}
              </>
            )}
          </p>
          {autoQty && (
            <p className={styles.qty}>
              <span className={styles.label}>QTY</span> {autoQty} {doseUnit?.value ?? ''}
            </p>
          )}
        </div>
        <button type="button" onClick={() => onRemove(row.id)} className={styles.removeBtn} aria-label="Remove order">
          <Close size={16} />
        </button>
      </div>

      <div className={styles.editable}>
        <input
          type="number"
          value={row.dose ?? ''}
          onChange={(e) => onChange(row.id, { dose: e.target.value ? Number(e.target.value) : null })}
          placeholder="Dose"
          className={styles.input}
        />
        <Select
          id={`dose-units-${row.id}`}
          value={row.doseUnits}
          onChange={(e) => onChange(row.id, { doseUnits: e.target.value })}
          size="sm"
          className={styles.select}
        >
          {orderConfig.drugDosingUnits.map((u) => (
            <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
          ))}
        </Select>
        <Select
          id={`route-${row.id}`}
          value={row.route}
          onChange={(e) => onChange(row.id, { route: e.target.value })}
          size="sm"
          className={styles.select}
        >
          {orderConfig.drugRoutes.map((r) => (
            <SelectItem key={r.valueCoded} value={r.valueCoded} text={r.value} />
          ))}
        </Select>
        <Select
          id={`freq-${row.id}`}
          value={row.frequency}
          onChange={(e) => onChange(row.id, { frequency: e.target.value })}
          size="sm"
          className={styles.select}
        >
          {orderConfig.orderFrequencies.map((f) => (
            <SelectItem key={f.valueCoded} value={f.valueCoded} text={(f as { value?: string }).value ?? ''} />
          ))}
        </Select>
        <input
          type="number"
          value={row.duration ?? ''}
          onChange={(e) => onChange(row.id, { duration: e.target.value ? Number(e.target.value) : null })}
          placeholder="Dur"
          min={1}
          className={styles.input}
        />
        <Select
          id={`dur-units-${row.id}`}
          value={row.durationUnits}
          onChange={(e) => onChange(row.id, { durationUnits: e.target.value })}
          size="sm"
          className={styles.select}
        >
          {orderConfig.durationUnits.map((u) => (
            <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
          ))}
        </Select>
      </div>
    </div>
  );
}
