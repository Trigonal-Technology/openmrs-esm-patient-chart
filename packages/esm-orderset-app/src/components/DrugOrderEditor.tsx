import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashCan, Add, WarningAlt, Medication, Scalpel, ImageMedical, Microscope, ToolBox } from '@carbon/react/icons';
import {
  Button,
  NumberInput,
  Select,
  SelectItem,
  Tooltip,
  Tile,
  SkeletonText,
  IconButton,
  Tag,
  Checkbox,
  TextInput,
} from '@carbon/react';
import { ChevronDown, ChevronUp } from '@carbon/react/icons';
import type { OrderItem, OrderMemberType } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { useDrugSearch, useConceptSearch } from '../resources/drug-search.resource';
import styles from './drug-order-editor.scss';

interface DrugOrderEditorProps {
  drugs: OrderItem[];
  onChange: (drugs: OrderItem[]) => void;
  orderConfig: OrderConfigObject;
  orderSetName: string;
}

import { findValueCodedByDisplay, getDisplayForConfig, findValueCodedById } from '../lib/order-config-utils';

const DUPLICATE_WARNING = 'This item appears more than once in the order.';

const MEMBER_TYPE_TO_ORDER_TYPE_ID: Record<string, number> = {
  DRUG: 2,
  LAB: 3,
  PROCEDURE: 4,
  RADIOLOGY: 6,
  MEDICAL_SUPPLY: 7,
};

const getMemberIcon = (type: OrderMemberType) => {
  switch (type) {
    case 'DRUG': return <Medication size={16} />;
    case 'LAB': return <Microscope size={16} />;
    case 'RADIOLOGY': return <ImageMedical size={16} />;
    case 'PROCEDURE': return <Scalpel size={16} />;
    case 'MEDICAL_SUPPLY': return <ToolBox size={16} />;
    default: return <Medication size={16} />;
  }
};

export default function DrugOrderEditor({
  drugs,
  onChange,
  orderConfig,
  orderSetName,
}: DrugOrderEditorProps) {
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

  const { drugs: apiDrugResults, isLoading: isSearchingDrugs } = useDrugSearch(debouncedSearch);
  const { concepts: apiConceptResults, isLoading: isSearchingConcepts } = useConceptSearch(debouncedSearch);
  const isSearching = isSearchingDrugs || isSearchingConcepts;

  const handleUpdate = (id: string, updates: Partial<OrderItem>) => {
    const enrichedUpdates = { ...updates };

    if (updates.doseUnit && orderConfig) {
      enrichedUpdates.doseUnitConceptId = orderConfig.drugDosingUnits.find(u => u.valueCoded === updates.doseUnit)?.conceptId;
    }
    if (updates.route && orderConfig) {
      enrichedUpdates.routeConceptId = orderConfig.drugRoutes.find(r => r.valueCoded === updates.route)?.conceptId;
    }
    if (updates.frequency && orderConfig) {
      enrichedUpdates.frequencyConceptId = orderConfig.orderFrequencies.find(f => f.valueCoded === updates.frequency)?.conceptId;
    }
    if (updates.durationUnit && orderConfig) {
      enrichedUpdates.durationUnitConceptId = orderConfig.durationUnits.find(u => u.valueCoded === updates.durationUnit)?.conceptId;
    }
    if (updates.quantityUnits && orderConfig) {
      // User requested to use doseunits as quantity units for drugs for now
      enrichedUpdates.quantityUnitsConceptId = orderConfig.drugDosingUnits.find(u => u.valueCoded === updates.quantityUnits)?.conceptId;
    }

    onChange(drugs.map((d) => (d.id === id ? { ...d, ...enrichedUpdates } : d)));
  };

  const removeDrug = (id: string) => {
    onChange(drugs.filter((d) => d.id !== id));
  };

  const addItem = (name: string, type: OrderMemberType, uuid?: string, conceptId?: number) => {
    const defaultDoseUnit = orderConfig.drugDosingUnits[0];
    const defaultRoute = orderConfig.drugRoutes.find((r) => r.value?.toLowerCase().includes('oral')) ?? orderConfig.drugRoutes[0];
    const defaultFreq = orderConfig.orderFrequencies[1] ?? orderConfig.orderFrequencies[0];
    const defaultDurationUnit = orderConfig.durationUnits[0];

    const newItem: OrderItem = {
      id: `new-${Date.now()}`,
      drugName: name,
      memberType: type,
      isDrug: type === 'DRUG',
      conceptUuid: uuid,
      conceptId: type === 'DRUG' ? undefined : conceptId,
      drugId: type === 'DRUG' ? conceptId : undefined,
      orderTypeId: MEMBER_TYPE_TO_ORDER_TYPE_ID[type] || 2,
      dose: type === 'DRUG' ? 0 : undefined,
      doseUnit: type === 'DRUG' ? (defaultDoseUnit?.valueCoded ?? '') : undefined,
      doseUnitConceptId: type === 'DRUG' ? defaultDoseUnit?.conceptId : undefined,
      route: type === 'DRUG' ? (defaultRoute?.valueCoded ?? '') : undefined,
      routeConceptId: type === 'DRUG' ? defaultRoute?.conceptId : undefined,
      frequency: type === 'DRUG' ? (defaultFreq?.valueCoded ?? '') : undefined,
      frequencyConceptId: type === 'DRUG' ? defaultFreq?.conceptId : undefined,
      duration: type === 'DRUG' ? 7 : undefined,
      durationUnit: type === 'DRUG' ? (defaultDurationUnit?.valueCoded ?? '') : undefined,
      durationUnitConceptId: type === 'DRUG' ? defaultDurationUnit?.conceptId : undefined,
      quantity: (type === 'DRUG' || type === 'MEDICAL_SUPPLY') ? 1 : undefined,
      quantityUnits: (type === 'DRUG' || type === 'MEDICAL_SUPPLY') ? (defaultDoseUnit?.valueCoded ?? '') : undefined,
      quantityUnitsConceptId: (type === 'DRUG' || type === 'MEDICAL_SUPPLY') ? defaultDoseUnit?.conceptId : undefined,
      numberOfRepeats: type === 'PROCEDURE' ? 1 : undefined,
      asNeeded: type === 'DRUG' ? false : undefined,
      numRefills: type === 'DRUG' ? 0 : undefined,
    };
    onChange([...drugs, newItem]);
    setExpandedCards((prev) => new Set([...prev, newItem.id]));
    setShowAddDrug(false);
    setAddSearch('');
  };

  const drugNameCounts = drugs.reduce((acc, d) => {
    acc[d.drugName] = (acc[d.drugName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredAddItems = [
    ...apiDrugResults.map((d) => ({ name: d.display || d.name, type: 'DRUG' as const, uuid: d.uuid, id: d.id })),
    ...apiConceptResults.map((c) => {
      let type: OrderMemberType = 'LAB';
      const classDisplay = c.conceptClass?.display?.toLowerCase();
      if (classDisplay?.includes('radiology')) type = 'RADIOLOGY';
      else if (classDisplay?.includes('procedure')) type = 'PROCEDURE';
      else if (classDisplay?.includes('medical supply')) type = 'MEDICAL_SUPPLY';
      return {
        name: c.display,
        type,
        uuid: c.uuid,
        id: c.id,
        classLabel: c.conceptClass?.display
      };
    }),
  ].slice(0, 8);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('orders', 'Orders')}</h2>
          <p className={styles.subtitle}>{orderSetName}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>
            {drugs.length} {drugs.length === 1 ? 'item' : 'items'}
          </span>
          <Button size="sm" kind="tertiary" renderIcon={Add} onClick={() => setShowAddDrug(!showAddDrug)}>
            {t('addItem', 'Add Item')}
          </Button>
        </div>
      </div>

      {showAddDrug && (
        <div className={styles.addSection}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('searchItemToAdd', 'Search item to add...')}
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
                {filteredAddItems.map((item) => (
                  <button
                    key={`${item.uuid}-${item.type}`}
                    type="button"
                    className={styles.drugChip}
                    onClick={() => addItem(item.name, item.type, item.uuid, item.id)}
                  >
                    <span className={styles.chipIcon}>{getMemberIcon(item.type)}</span>
                    {item.name}
                    {'classLabel' in item && item.classLabel && <span className={styles.chipClass}> ({item.classLabel})</span>}
                  </button>
                ))}
                {debouncedSearch && filteredAddItems.length === 0 && (
                  <div className={styles.noResults}>
                    {t('noResults', 'No matching items found')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.cardsWrapper}>
        {drugs.map((drug, idx) => {
          const isDuplicate = drugNameCounts[drug.drugName] > 1;
          const isExpanded = expandedCards.has(drug.id);
          const isDrug = drug.memberType === 'DRUG';

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
                  <span className={styles.memberIcon}>{getMemberIcon(drug.memberType)}</span>
                  <span className={styles.drugName}>{drug.drugName}</span>
                  <Tag type={isDrug ? 'teal' : 'purple'} size="sm" className={styles.typeTag}>
                    {drug.memberType}
                  </Tag>
                  {isDuplicate && (
                    <Tooltip align="top" label={DUPLICATE_WARNING}>
                      <WarningAlt size={16} className={styles.warningIcon} />
                    </Tooltip>
                  )}
                  {!isExpanded && (isDrug || drug.memberType === 'MEDICAL_SUPPLY') && (
                    <span className={styles.collapsedSummary}>
                      — {isDrug && (
                        <>
                          {drug.dose} {getDisplayForConfig(orderConfig.drugDosingUnits, drug.doseUnit || '')} ·{' '}
                          {getDisplayForConfig(orderConfig.drugRoutes, drug.route || '')} ·{' '}
                          {getDisplayForConfig(orderConfig.orderFrequencies, drug.frequency || '')} · {drug.duration}{' '}
                          {getDisplayForConfig(orderConfig.durationUnits, drug.durationUnit || '')} ·{' '}
                        </>
                      )}
                      {drug.quantity} {getDisplayForConfig(orderConfig.drugDosingUnits, drug.quantityUnits || '')}
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
                    {isDrug && (
                      <>
                        <div className={styles.formGroup}>
                          <label className="cds--label" htmlFor={`dose-${drug.id}`}>{t('dose', 'Dose')}</label>
                          <NumberInput
                            id={`dose-${drug.id}`}
                            hideLabel
                            value={drug.dose || ''}
                            onChange={(_, { value }) =>
                              handleUpdate(drug.id, { dose: value !== '' && value !== undefined ? Number(value) : 0 })
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
                            value={drug.doseUnit || findValueCodedById(orderConfig.drugDosingUnits, drug.doseUnitConceptId) || ''}
                            onChange={(e) => handleUpdate(drug.id, { doseUnit: e.target.value })}
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
                            value={drug.route || findValueCodedById(orderConfig.drugRoutes, drug.routeConceptId) || ''}
                            onChange={(e) => handleUpdate(drug.id, { route: e.target.value })}
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
                            value={drug.frequency || findValueCodedById(orderConfig.orderFrequencies, drug.frequencyConceptId) || ''}
                            onChange={(e) => handleUpdate(drug.id, { frequency: e.target.value })}
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
                          <label className="cds--label" htmlFor={`duration-${drug.id}`}>{t('duration', 'Duration')}</label>
                          <NumberInput
                            id={`duration-${drug.id}`}
                            hideLabel
                            value={drug.duration || ''}
                            onChange={(_, { value }) =>
                              handleUpdate(drug.id, { duration: value !== '' && value !== undefined ? Number(value) : 0 })
                            }
                            size="md"
                            min={1}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <Select
                            id={`durUnit-${drug.id}`}
                            labelText={t('durationUnit', 'Unit')}
                            value={drug.durationUnit || findValueCodedById(orderConfig.durationUnits, drug.durationUnitConceptId) || ''}
                            onChange={(e) => handleUpdate(drug.id, { durationUnit: e.target.value })}
                            size="md"
                          >
                            {orderConfig.durationUnits.map((u) => (
                              <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
                            ))}
                          </Select>
                        </div>
                        <div className={styles.formGroup}>
                          <label className="cds--label" htmlFor={`qty-${drug.id}`}>{t('quantity', 'Quantity')}</label>
                          <NumberInput
                            id={`qty-${drug.id}`}
                            hideLabel
                            value={drug.quantity || ''}
                            onChange={(_, { value }) =>
                              handleUpdate(drug.id, { quantity: value !== '' && value !== undefined ? Number(value) : 0 })
                            }
                            size="md"
                            min={0}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <Select
                            id={`qtyUnit-${drug.id}`}
                            labelText={t('quantityUnit', 'Quantity Unit')}
                            value={drug.quantityUnits || findValueCodedById(orderConfig.drugDosingUnits, drug.quantityUnitsConceptId) || ''}
                            onChange={(e) => handleUpdate(drug.id, { quantityUnits: e.target.value })}
                            size="md"
                          >
                            {orderConfig.drugDosingUnits.map((u) => (
                              <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
                            ))}
                          </Select>
                        </div>
                        <div className={styles.formGroup}>
                          <label className="cds--label" htmlFor={`refills-${drug.id}`}>{t('numRefills', 'Refills')}</label>
                          <NumberInput
                            id={`refills-${drug.id}`}
                            hideLabel
                            value={drug.numRefills || 0}
                            onChange={(_, { value }) =>
                              handleUpdate(drug.id, { numRefills: value !== '' && value !== undefined ? Number(value) : 0 })
                            }
                            size="md"
                            min={0}
                          />
                        </div>
                        <div className={styles.formGroup} style={{ alignSelf: 'center', marginTop: '1rem' }}>
                          <Checkbox
                            id={`asNeeded-${drug.id}`}
                            labelText={t('asNeeded', 'PRN')}
                            checked={drug.asNeeded || false}
                            onChange={(_, { checked }) => handleUpdate(drug.id, { asNeeded: checked })}
                          />
                        </div>
                        {drug.asNeeded && (
                          <div className={styles.formGroup}>
                            <TextInput
                              id={`asNeededCond-${drug.id}`}
                              labelText={t('asNeededCondition', 'PRN Condition')}
                              placeholder={t('prnConditionPlaceholder', 'e.g. For pain')}
                              value={drug.asNeededCondition || ''}
                              onChange={(e) => handleUpdate(drug.id, { asNeededCondition: e.target.value })}
                              size="md"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {drug.memberType === 'PROCEDURE' && (
                      <div className={styles.formGroup}>
                        <label className="cds--label" htmlFor={`repeats-${drug.id}`}>{t('numberOfRepeats', 'Number of Repeats')}</label>
                        <NumberInput
                          id={`repeats-${drug.id}`}
                          hideLabel
                          value={drug.numberOfRepeats || ''}
                          onChange={(_, { value }) =>
                            handleUpdate(drug.id, { numberOfRepeats: value !== '' && value !== undefined ? Number(value) : 0 })
                          }
                          size="md"
                          min={0}
                        />
                      </div>
                    )}
                    {drug.memberType === 'MEDICAL_SUPPLY' && (
                      <>
                        <div className={styles.formGroup}>
                          <label className="cds--label" htmlFor={`qty-${drug.id}`}>{t('quantity', 'Quantity')}</label>
                          <NumberInput
                            id={`qty-${drug.id}`}
                            hideLabel
                            value={drug.quantity || ''}
                            onChange={(_, { value }) =>
                              handleUpdate(drug.id, { quantity: value !== '' && value !== undefined ? Number(value) : 0 })
                            }
                            size="md"
                            min={0}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <Select
                            id={`qtyUnit-${drug.id}`}
                            labelText={t('quantityUnit', 'Quantity Unit')}
                            value={drug.quantityUnits || findValueCodedById(orderConfig.drugDosingUnits, drug.quantityUnitsConceptId) || ''}
                            onChange={(e) => handleUpdate(drug.id, { quantityUnits: e.target.value })}
                            size="md"
                          >
                            {orderConfig.drugDosingUnits.map((u) => (
                              <SelectItem key={u.valueCoded} value={u.valueCoded} text={u.value} />
                            ))}
                          </Select>
                        </div>
                      </>
                    )}
                    <div className={isDrug ? styles.formGroupInstructions : styles.formGroupFullWidth}>
                      <label className="cds--label" htmlFor={`instr-${drug.id}`}>{t('instructions', 'Instructions')}</label>
                      <input
                        id={`instr-${drug.id}`}
                        className="cds--text-input cds--text-input--md"
                        type="text"
                        placeholder={t('optionalInstructions', 'Optional instructions')}
                        value={drug.instructions || ''}
                        onChange={(e) => handleUpdate(drug.id, { instructions: e.target.value })}
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
            <p className={styles.emptyText}>{t('noItemsInOrder', 'No items in this order.')}</p>
            <p className={styles.emptyHint}>{t('selectOrAddItems', 'Select an order set or add items manually.')}</p>
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
