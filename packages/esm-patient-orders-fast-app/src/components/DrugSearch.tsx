import React, { useState, useRef, useEffect } from 'react';
import { useDebounce } from '@openmrs/esm-framework';
import { Close } from '@carbon/react/icons';
import { TextInput } from '@carbon/react';
import { useDrugSearch } from '../resources/drug-search.resource';
import type { DrugSearchResult } from '../resources/drug-search.resource';
import type { FastDrug } from '../lib/prescriptionParser';
import styles from './drug-search.scss';

interface DrugSearchProps {
  selectedDrug: FastDrug | null;
  onSelect: (drug: FastDrug) => void;
  onClear: () => void;
  defaultDoseUnit: string;
  defaultRoute: string;
  drugSearchResultToFastDrug: (d: DrugSearchResult, defaultDoseUnit: string, defaultRoute: string) => FastDrug;
}

export function DrugSearch({
  selectedDrug,
  onSelect,
  onClear,
  defaultDoseUnit,
  defaultRoute,
  drugSearchResultToFastDrug,
}: DrugSearchProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { drugs, isLoading } = useDrugSearch(debouncedQuery.length >= 2 ? debouncedQuery : '');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedDrug) {
    return (
      <div className={styles.selectedDrug}>
        <div className={styles.selectedInfo}>
          <p className={styles.drugName}>{selectedDrug.name}</p>
        </div>
        <button type="button" onClick={onClear} className={styles.clearBtn} aria-label="Clear drug">
          <Close size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.searchContainer}>
      <TextInput
        id="drug-search"
        labelText=""
        placeholder="Search for a medication…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        disabled={isLoading}
        size="md"
      />
      {showDropdown && query.length >= 2 && (
        <div className={styles.dropdown}>
          {isLoading ? (
            <div className={styles.loading}>Loading…</div>
          ) : drugs.length === 0 ? (
            <div className={styles.empty}>No medications found</div>
          ) : (
            drugs.slice(0, 8).map((d) => (
              <button
                key={d.uuid}
                type="button"
                className={styles.dropdownItem}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(drugSearchResultToFastDrug(d, defaultDoseUnit, defaultRoute));
                  setQuery('');
                  setShowDropdown(false);
                }}
              >
                {d.display || d.name}
                {d.strength && <span className={styles.strength}>{d.strength}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
