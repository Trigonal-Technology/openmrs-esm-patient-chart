import React from 'react';
import styles from './compact-field.scss';

interface CompactFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function CompactField({ label, children, className }: CompactFieldProps) {
  return (
    <div className={`${styles.compactField} ${className ?? ''}`}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}

interface NumberInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  suffix?: string;
  className?: string;
}

export function NumberInput({ value, onChange, placeholder, min = 0, suffix, className }: NumberInputProps) {
  return (
    <div className={`${styles.numberInput} ${className ?? ''}`}>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        min={min}
        placeholder={placeholder}
        className={styles.input}
      />
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </div>
  );
}
