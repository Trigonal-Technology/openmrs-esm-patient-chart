import React from 'react';
import { Button } from '@carbon/react';
import styles from './chip-select.scss';

interface ChipSelectProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function ChipSelect<T extends string | number>({ label, options, value, onChange }: ChipSelectProps<T>) {
  return (
    <div className={styles.chipSelect}>
      <label className={styles.label}>{label}</label>
      <div className={styles.chips}>
        {options.map((opt) => (
          <Button
            key={String(opt.value)}
            kind={value === opt.value ? 'primary' : 'tertiary'}
            size="sm"
            onClick={() => onChange(opt.value)}
            className={styles.chip}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
