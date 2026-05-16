import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashCan, Add, WarningAlt, ChevronDown, ChevronUp } from '@carbon/react/icons';
import { Button, NumberInput, Select, SelectItem, Tooltip, Tile, SkeletonText, IconButton } from '@carbon/react';
import type { DrugOrderItem } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { useDrugSearch } from '../resources/drug-search.resource';
import styles from './drug-order-editor.scss';

interface DrugOrderEditorProps {
  drugs: DrugOrderItem[];
  onChange: (drugs: DrugOrderItem[]) => void;
  orderConfig: OrderConfigObject;
  orderSetName: string;
}

import { findValueCodedByDisplay, getDisplayForConfig } from '../lib/order-config-utils';

const DUPLICATE_WARNING = 'This drug appears more than once in the order.';

export default function DrugOrderEditor({ drugs, onChange, orderConfig, orderSetName }: DrugOrderEditorProps) {
  const { t } = useTranslation();
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(addSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [addSearch]);

  const toggleCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { drugs: apiDrugResults, isLoading: isSearching } = useDrugSearch(debouncedSearch);

  const updateDrug = (id: string, field: keyof DrugOrderItem, value: string | number) => {
    onChange(drugs.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const removeDrug = (id: string) => {
    onChange(drugs.filter((d) => d.id !== id));
  };

  const addDrug = (drugName: string) => {
    const defaultDoseUnitCoded = orderConfig.drugDosingUnits[0]?.valueCoded ?? '';
    const defaultRoute =
      orderConfig.drugRoutes.find((r) => r.value?.toLowerCase().includes('oral')) ?? orderConfig.drugRoutes[0];
    const defaultFreq = orderConfig.orderFrequencies[1] ?? orderConfig.orderFrequencies[0];
    const defaultDurationUnit = orderConfig.durationUnits[0];
    const newDrug: DrugOrderItem = {
      id: `new-${Date.now()}`,
      drugName,
      dose: 0,
      doseUnit: defaultDoseUnitCoded,
      route: defaultRoute?.valueCoded ?? '',
      frequency: defaultFreq?.valueCoded ?? '',
      duration: 7,
      durationUnit: defaultDurationUnit?.valueCoded ?? '',
    };
    onChange([...drugs, newDrug]);
    setExpandedCards((prev) => new Set([...prev, newDrug.id]));
    setShowAddDrug(false);
    setAddSearch('');
  };

  const drugNameCounts = drugs.reduce(
    (acc, d) => {
      acc[d.drugName] = (acc[d.drugName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const filteredAddDrugs = apiDrugResults
    .map((d) => d.display || d.name)
    .filter(Boolean)
    .slice(0, 8);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('drugOrders', 'Drug Orders')}</h2>
          <p className={styles.subtitle}>{orderSetName}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>
            {drugs.length} {drugs.length === 1 ? 'drug' : 'drugs'}
          </span>
          <Button size="sm" kind="tertiary" renderIcon={Add} onClick={() => setShowAddDrug(!showAddDrug)}>
            {t('addDrug', 'Add Drug')}
          </Button>
        </div>
      </div>

      {showAddDrug && (
        <div className={styles.addSection}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('searchDrugToAdd', 'Search drug to add...')}
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.drugChips}>
            {isSearching ? (
              <div className={styles.loadingSkeleton}>
                <SkeletonText />
                <SkeletonText width="60%" />
              </div>
            ) : (
              <>
                {filteredAddDrugs.map((d) => (
                  <button key={d} type="button" className={styles.drugChip} onClick={() => addDrug(d)}>
                    {d}
                  </button>
                ))}
                {debouncedSearch && filteredAddDrugs.length === 0 && (
                  <div className={styles.noResults}>{t('noDrugResults', 'No matching drugs found')}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.cardsWrapper}>
        {drugs.map((drug, idx) => {
          const isDuplicate = drugNameCounts[drug.drugName] > 1;
          const doseUnitValue = findValueCodedByDisplay(orderConfig.drugDosingUnits, drug.doseUnit);
          const routeValue = findValueCodedByDisplay(orderConfig.drugRoutes, drug.route);
          const freqValue = findValueCodedByDisplay(orderConfig.orderFrequencies, drug.frequency);
          const durUnitValue = findValueCodedByDisplay(orderConfig.durationUnits, drug.durationUnit);

          const isExpanded = expandedCards.has(drug.id);

          return (
            <Tile key={drug.id} className={`${styles.card} ${isDuplicate ? styles.cardDuplicate : ''}`}>
              <div
                className={styles.cardHeader}
                onClick={() => toggleCard(drug.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleCard(drug.id);
                }}
              >
                <div className={styles.cardHeaderLeft}>
                  <IconButton
                    kind="ghost"
                    size="sm"
                    className={styles.expandIcon}
                    label={isExpanded ? t('collapse', 'Collapse') : t('expand', 'Expand')}
                    onClick={(e) => toggleCard(drug.id, e)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </IconButton>
                  <span className={styles.drugName}>{drug.drugName}</span>
                  {isDuplicate && (
                    <Tooltip align="top" label={DUPLICATE_WARNING}>
                      <WarningAlt size={16} className={styles.warningIcon} />
                    </Tooltip>
                  )}
                  {!isExpanded && (
                    <span className={styles.collapsedSummary}>
                      — {drug.dose} {getDisplayForConfig(orderConfig.drugDosingUnits, drug.doseUnit)} ·{' '}
                      {getDisplayForConfig(orderConfig.drugRoutes, drug.route)} ·{' '}
                      {getDisplayForConfig(orderConfig.orderFrequencies, drug.frequency)} · {drug.duration}{' '}
                      {getDisplayForConfig(orderConfig.durationUnits, drug.durationUnit)}
                    </span>
                  )}
                </div>
                <div className={styles.cardHeaderRight}>
                  <IconButton
                    kind="ghost"
                    size="sm"
                    className={styles.deleteButton}
                    label={t('remove', 'Remove')}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDrug(drug.id);
                    }}
                  >
                    <TrashCan size={16} />
                  </IconButton>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.cardBody}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className="cds--label" htmlFor={`dose-${drug.id}`}>
                        {t('dose', 'Dose')}
                      </label>
                      <NumberInput
                        id={`dose-${drug.id}`}
                        hideLabel
                        value={drug.dose || ''}
                        onChange={(_, { value }) =>
                          updateDrug(drug.id, 'dose', value !== '' && value !== undefined ? Number(value) : 0)
                        }
                        size="md"
                        min={0}
                        invalid={drug.dose === 0}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <Select
                        id={`doseUnit-${drug.id}`}
                        labelText={t('unit', 'Unit')}
                        value={doseUnitValue}
                        onChange={(e) => updateDrug(drug.id, 'doseUnit', e.target.value)}
                        size="md"
                      >
                        {orderConfig.drugDosingUnits.map((u) => (
                          <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
                        ))}
                      </Select>
                    </div>
                    <div className={styles.formGroup}>
                      <Select
                        id={`route-${drug.id}`}
                        labelText={t('route', 'Route')}
                        value={routeValue}
                        onChange={(e) => updateDrug(drug.id, 'route', e.target.value)}
                        size="md"
                      >
                        {orderConfig.drugRoutes.map((r) => (
                          <SelectItem key={r.valueCoded} value={r.valueCoded} text={r.value} />
                        ))}
                      </Select>
                    </div>
                    <div className={styles.formGroup}>
                      <Select
                        id={`freq-${drug.id}`}
                        labelText={t('frequency', 'Frequency')}
                        value={freqValue}
                        onChange={(e) => updateDrug(drug.id, 'frequency', e.target.value)}
                        size="md"
                      >
                        {orderConfig.orderFrequencies.map((f) => (
                          <SelectItem
                            key={f.valueCoded}
                            value={f.valueCoded}
                            text={(f as { value?: string }).value ?? ''}
                          />
                        ))}
                      </Select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className="cds--label" htmlFor={`duration-${drug.id}`}>
                        {t('duration', 'Duration')}
                      </label>
                      <NumberInput
                        id={`duration-${drug.id}`}
                        hideLabel
                        value={drug.duration || ''}
                        onChange={(_, { value }) =>
                          updateDrug(drug.id, 'duration', value !== '' && value !== undefined ? Number(value) : 0)
                        }
                        size="md"
                        min={1}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <Select
                        id={`durUnit-${drug.id}`}
                        labelText={t('durationUnit', 'Unit')}
                        value={durUnitValue}
                        onChange={(e) => updateDrug(drug.id, 'durationUnit', e.target.value)}
                        size="md"
                      >
                        {orderConfig.durationUnits.map((u) => (
                          <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
                        ))}
                      </Select>
                    </div>
                    <div className={styles.formGroupInstructions}>
                      <label className="cds--label" htmlFor={`instr-${drug.id}`}>
                        {t('instructions', 'Instructions')}
                      </label>
                      <input
                        id={`instr-${drug.id}`}
                        className="cds--text-input cds--text-input--md"
                        type="text"
                        placeholder={t('optionalInstructions', 'Optional instructions')}
                        value={drug.instructions || ''}
                        onChange={(e) => updateDrug(drug.id, 'instructions', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Tile>
          );
        })}

        {drugs.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>{t('noDrugsInOrder', 'No drugs in this order.')}</p>
            <p className={styles.emptyHint}>{t('selectOrAddDrugs', 'Select an order set or add drugs manually.')}</p>
          </div>
        )}
      </div>

      {drugs.some((d) => d.instructions) && (
        <div className={styles.notes}>
          <p className={styles.notesLabel}>{t('notes', 'Notes')}</p>
          {drugs
            .filter((d) => d.instructions)
            .map((d) => (
              <p key={d.id} className={styles.noteItem}>
                <span className={styles.noteDrug}>{d.drugName}:</span>{' '}
                <span className={styles.noteText}>{d.instructions}</span>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
