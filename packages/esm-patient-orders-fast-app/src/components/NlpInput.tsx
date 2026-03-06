import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Add } from '@carbon/react/icons';
import { TextInput, Button } from '@carbon/react';
import { useDebounce } from '@openmrs/esm-framework';
import { useDrugSearch } from '../resources/drug-search.resource';
import {
  parsePrescription,
  drugSearchResultToFastDrug,
  type ParsedPrescription,
  type FastDrug,
} from '../lib/prescriptionParser';
import type { OrderConfigObject } from '../resources/order-config.resource';
import styles from './nlp-input.scss';

interface NlpInputProps {
  onParsed: (parsed: ParsedPrescription) => void;
  orderConfig: OrderConfigObject;
}

export function NlpInput({ onParsed, orderConfig }: NlpInputProps) {
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<ParsedPrescription | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedValue = useDebounce(value, 300);
  const { drugs } = useDrugSearch(debouncedValue.length >= 2 ? debouncedValue : '');
  const inputRef = useRef<HTMLInputElement>(null);

  const fastDrugs: FastDrug[] = drugs.map((d) =>
    drugSearchResultToFastDrug(
      d,
      orderConfig.drugDosingUnits[0]?.valueCoded ?? '',
      orderConfig.drugRoutes[0]?.valueCoded ?? '',
    ),
  );

  useEffect(() => {
    if (value.trim().length > 2) {
      const parsed = parsePrescription(value, fastDrugs, orderConfig);
      setPreview(parsed.drug ? parsed : null);
    } else {
      setPreview(null);
    }
  }, [value, fastDrugs, orderConfig]);

  const handleChange = useCallback((text: string) => {
    setValue(text);
    setShowSuggestions(true);
  }, []);

  const matchingDrugs = fastDrugs.slice(0, 6);

  const handleDrugSelect = useCallback((drug: FastDrug) => {
    setValue(drug.name + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    const parsed = parsePrescription(value, fastDrugs, orderConfig);
    onParsed(parsed);
    setValue('');
    setPreview(null);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, onParsed, fastDrugs, orderConfig]);

  const confidenceColor =
    preview?.confidence >= 0.8 ? styles.highConf : preview?.confidence >= 0.5 ? styles.medConf : styles.lowConf;
  const shouldShowDrugs = showSuggestions && matchingDrugs.length > 0 && !preview?.drug;

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <TextInput
          id="nlp-prescription-input"
          labelText=""
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder='Type prescription: "Amoxicillin 500mg PO BID x 7 days"'
          className={styles.input}
        />
        <Button kind="primary" size="md" onClick={handleSubmit} disabled={!value.trim()} renderIcon={Add}>
          Add
        </Button>
      </div>

      {shouldShowDrugs && (
        <div className={styles.suggestions}>
          {matchingDrugs.map((drug) => (
            <button
              key={drug.uuid}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleDrugSelect(drug);
              }}
              className={styles.suggestionItem}
            >
              {drug.name}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className={styles.preview}>
          <span className={styles.previewText}>
            {preview.drug?.name ?? '?'}
            {preview.dose != null ? ` ${preview.dose}` : ''}
            {preview.frequency ? ' → parsed' : ''}
          </span>
          <span className={`${styles.confidence} ${confidenceColor}`}>{Math.round(preview.confidence * 100)}%</span>
        </div>
      )}

      <p className={styles.hint}>
        e.g. &quot;Paracetamol 500mg PO BID x 7 days&quot; · &quot;Ibuprofen 400mg TID for 5d PRN&quot;
      </p>
    </div>
  );
}
