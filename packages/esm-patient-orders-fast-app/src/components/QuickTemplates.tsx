import React from 'react';
import { Tag } from '@carbon/react';
import styles from './quick-templates.scss';

export interface PrescriptionTemplate {
  label: string;
  rx: string;
  category: string;
}

const TEMPLATES: PrescriptionTemplate[] = [
  { label: 'Paracetamol 500mg BID × 5d', rx: 'Paracetamol 500mg PO BID x 5 days', category: 'Pain' },
  { label: 'Amoxicillin 500mg TID × 7d', rx: 'Amoxicillin 500mg PO TID x 7 days', category: 'Antibiotic' },
  { label: 'Ibuprofen 400mg TID × 5d PRN', rx: 'Ibuprofen 400mg PO TID x 5 days PRN', category: 'Pain' },
  { label: 'Metformin 500mg BID × 30d', rx: 'Metformin 500mg PO BID x 30 days', category: 'Diabetes' },
  { label: 'Omeprazole 20mg OD × 14d', rx: 'Omeprazole 20mg PO OD x 14 days', category: 'GI' },
  { label: 'Amlodipine 5mg OD × 30d', rx: 'Amlodipine 5mg PO OD x 30 days', category: 'BP' },
  { label: 'Ciprofloxacin 500mg BID × 7d', rx: 'Ciprofloxacin 500mg PO BID x 7 days', category: 'Antibiotic' },
];

interface QuickTemplatesProps {
  onSelect: (rx: string) => void;
}

export function QuickTemplates({ onSelect }: QuickTemplatesProps) {
  return (
    <div className={styles.container}>
      <p className={styles.label}>Quick order templates</p>
      <div className={styles.templates}>
        {TEMPLATES.map((t) => (
          <button key={t.rx} type="button" onClick={() => onSelect(t.rx)} className={styles.templateBtn}>
            <Tag type={getTagType(t.category)} size="md" title={t.category}>
              {t.category}
            </Tag>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getTagType(category: string): 'red' | 'teal' | 'purple' | 'blue' | 'gray' {
  switch (category) {
    case 'Pain':
      return 'red';
    case 'Antibiotic':
      return 'teal';
    case 'Diabetes':
      return 'purple';
    case 'BP':
      return 'blue';
    default:
      return 'gray';
  }
}
