import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, OverflowMenu, OverflowMenuItem, Tile, Search } from '@carbon/react';
import { OverflowMenuHorizontal, Add, Checkmark } from '@carbon/react/icons';
import type { OrderSet } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { getDisplayForConfig } from '../lib/order-config-utils';
import styles from './order-set-list.scss';

interface OrderSetListProps {
  orderSets: OrderSet[];
  customSetIds: Set<string>;
  onOpen: (set: OrderSet) => void;
  onEdit: (set: OrderSet) => void;
  onDelete: (setId: string) => void;
  onCreateNew: () => void;
  orderConfig?: OrderConfigObject;
}

export default function OrderSetList({
  orderSets,
  customSetIds,
  onOpen,
  onEdit,
  onDelete,
  onCreateNew,
  orderConfig,
}: OrderSetListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderSets;
    return orderSets.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [orderSets, search]);

  const categories = useMemo(() => [...new Set(filtered.map((s) => s.category))].filter(Boolean), [filtered]);

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <Search
          id="orderset-list-search"
          ref={inputRef}
          labelText={t('searchOrderSetsPlaceholder', 'Search order sets...')}
          className={styles.searchInput}
          placeholder={t('searchOrderSetsPlaceholder', 'Search order sets...')}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
        <Button kind="primary" size="md" renderIcon={Add} onClick={onCreateNew} className={styles.createButton}>
          {t('createOrderSet', 'Create Order Set')}
        </Button>
      </div>

      <div className={styles.list}>
        {categories.map((cat) => (
          <div key={cat} className={styles.category}>
            <p className={styles.categoryLabel}>{cat}</p>
            <div className={styles.cards}>
              {filtered
                .filter((s) => s.category === cat)
                .map((set) => {
                  const isCustom = customSetIds.has(set.id);
                  return (
                    <Tile
                      key={set.id}
                      className={`${styles.card} ${styles.clickableCard}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(set)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpen(set);
                        }
                      }}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitleBlock}>
                          <div className={styles.cardTitleRow}>
                            <p className={styles.cardTitle}>{set.name}</p>
                            <div className={styles.drugCountBadge}>
                              {set.drugs.length} {set.drugs.length === 1 ? t('drug', 'Drug') : t('drugs', 'Drugs')}
                            </div>
                          </div>
                          <p className={styles.cardDescription}>{set.description}</p>
                        </div>
                        {isCustom && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <OverflowMenu
                              size="sm"
                              ariaLabel="Actions"
                              iconDescription="Actions"
                              renderIcon={OverflowMenuHorizontal}
                            >
                              <OverflowMenuItem itemText={t('edit', 'Edit')} onClick={() => onEdit(set)} />
                              <OverflowMenuItem
                                itemText={t('delete', 'Delete')}
                                isDelete
                                hasDivider
                                onClick={() => onDelete(set.id)}
                              />
                            </OverflowMenu>
                          </div>
                        )}
                      </div>

                      <div className={styles.cardDrugPreview}>
                        {set.drugs.length === 0 ? (
                          <p className={styles.previewEmpty}>{t('noDrugsConfigured', 'No drugs configured')}</p>
                        ) : (
                          <ul className={styles.previewList}>
                            {set.drugs.slice(0, 3).map((d) => (
                              <li key={d.id}>
                                <div className={styles.checkIconContainer}>
                                  <Checkmark size={12} className={styles.checkIcon} />
                                </div>
                                <span className={styles.previewName}>{d.drugName}</span>
                                {d.dose > 0 && orderConfig && (
                                  <span className={styles.previewMeta}>
                                    {' '}
                                    {d.dose} {getDisplayForConfig(orderConfig.drugDosingUnits, d.doseUnit)}
                                  </span>
                                )}
                              </li>
                            ))}
                            {set.drugs.length > 3 && (
                              <li className={styles.previewMore}>
                                + {set.drugs.length - 3} {t('more', 'more')}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </Tile>
                  );
                })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className={styles.empty}>
            <p>{t('noOrderSetsMatch', 'No order sets match \"{{search}}\"', { search })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
