import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, OverflowMenu, OverflowMenuItem, Tile, Search } from '@carbon/react';
import { OverflowMenuHorizontal, Add, Checkmark, Medication, Scalpel, ImageMedical, Microscope, ToolBox } from '@carbon/react/icons';
import type { OrderSet, OrderMemberType } from '../resources/orderset-config';
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

const getMemberIcon = (type: OrderMemberType) => {
  switch (type) {
    case 'DRUG': return <Medication size={16} />;
    case 'LAB': return <Microscope size={16} />;
    case 'RADIOLOGY': return <ImageMedical size={16} />;
    case 'PROCEDURE': return <Scalpel size={16} />;
    case 'MEDICAL_SUPPLY': return <ToolBox size={16} />;
    default: return <Checkmark size={12} />;
  }
};

export default function OrderSetList({
  orderSets,
  customSetIds,
  onOpen,
  onEdit,
  onDelete,
  onCreateNew,
  orderConfig
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
                              {set.members.length} {set.members.length === 1 ? t('item', 'Item') : t('items', 'Items')}
                            </div>
                          </div>
                          <p className={styles.cardDescription}>{set.description}</p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <OverflowMenu
                            size="sm"
                            ariaLabel="Actions"
                            iconDescription="Actions"
                            renderIcon={OverflowMenuHorizontal}
                            flipped
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
                      </div>

                      <div className={styles.cardDrugPreview}>
                        {set.members.length === 0 ? (
                          <p className={styles.previewEmpty}>{t('noItemsConfigured', 'No items configured')}</p>
                        ) : (
                          <ul className={styles.previewList}>
                            {set.members.slice(0, 3).map((d) => (
                              <li key={d.id} className={styles.previewListItem}>
                                <div className={styles.checkIconContainer}>
                                  {getMemberIcon(d.memberType)}
                                </div>
                                <span className={styles.previewName}>{d.drugName}</span>
                                {d.memberType === 'DRUG' && d.dose && d.dose > 0 && orderConfig && (
                                  <span className={styles.previewMeta}>
                                    {' '}
                                    {d.dose} {getDisplayForConfig(orderConfig.drugDosingUnits, d.doseUnit)}                                  </span>
                                )}
                              </li>
                            ))}
                            {set.members.length > 3 && (
                              <li className={styles.previewMore}>
                                + {set.members.length - 3} {t('more', 'more')}
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

