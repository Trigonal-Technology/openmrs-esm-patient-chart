import React, { useState } from 'react';
import { DocumentPdf, Copy, Checkmark } from '@carbon/react/icons';
import styles from './prescription-preview.scss';

interface PrescriptionPreviewProps {
  summary: string;
  isValid: boolean;
}

export function PrescriptionPreview({ summary, isValid }: PrescriptionPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!summary) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <DocumentPdf size={16} className={styles.icon} />
        <div className={styles.text}>
          <p className={styles.label}>Prescription summary</p>
          <p className={`${styles.summary} ${!isValid ? styles.invalid : ''}`}>{summary}</p>
        </div>
        <button type="button" onClick={handleCopy} className={styles.copyBtn} aria-label="Copy to clipboard">
          {copied ? <Checkmark size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
