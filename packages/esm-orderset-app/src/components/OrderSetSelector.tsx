import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Add, ChevronRight, TrashCan, OverflowMenuHorizontal } from '@carbon/react/icons';
import { Button, TextInput, Tag, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import type { OrderSet } from '../resources/orderset-config';
import styles from './order-set-selector.scss';

interface OrderSetSelectorProps {
  orderSets: OrderSet[];
  onSelect: (set: OrderSet) => void;
  onCreateNew: () => void;
  onEdit?: (set: OrderSet) => void;
  onDelete?: (setId: string) => void;
  selectedId?: string;
  customSetIds: Set<string>;
}

export default function OrderSetSelector({
  orderSets,
  onSelect,
  onCreateNew,
  onEdit,
  onDelete,
  selectedId,
  customSetIds,
}: OrderSetSelectorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = orderSets.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [...new Set(filtered.map((s) => s.category))].filter(Boolean);

  useEffect(() => {
    setFocusIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[focusIndex]) {
      onSelect(filtered[focusIndex]);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={styles.container}>
      {/* <div className={styles.header}>
        <h2 className={styles.heading}>{t('orderSets', 'Order Sets')}</h2>
        <Button size="sm" kind="tertiary" renderIcon={Add} onClick={onCreateNew}>
          {t('new', 'New')}
        </Button>
      </div> */}

      <div className={styles.searchWrapper}>
        <TextInput
            id="orderset-search"
            ref={inputRef}
            size="md"
            placeholder={t('searchOrderSets', 'Search order sets... (↑↓ Enter)')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            labelText=""
            hideLabel
          />
      </div>

      <div className={styles.list}>
        {categories.map((cat) => (
          <div key={cat} className={styles.category}>
            <p className={styles.categoryLabel}>{cat}</p>
            {filtered
              .filter((s) => s.category === cat)
              .map((set) => {
                const globalIdx = filtered.indexOf(set);
                const isActive = selectedId === set.id;
                const isFocused = focusIndex === globalIdx;
                const isCustom = customSetIds.has(set.id);
                return (
                  <button
                    key={set.id}
                    type="button"
                    className={`${styles.setButton} ${isActive ? styles.setButtonActive : ''} ${isFocused ? styles.setButtonFocused : ''}`}
                    onClick={() => onSelect(set)}
                  >
                    <div className={styles.setRow}>
                      <span className={`${styles.setName} ${isActive ? styles.setNameActive : ''}`}>
                        {set.name}
                      </span>
                      <div className={styles.setActions}>
                        {isCustom && (
                          <OverflowMenu
                            size="sm"
                            ariaLabel="Actions"
                            iconDescription="Actions"
                            renderIcon={OverflowMenuHorizontal}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                          >
                            <OverflowMenuItem
                              itemText={t('edit', 'Edit')}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(set);
                              }}
                            />
                            <OverflowMenuItem
                              itemText={t('delete', 'Delete')}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(set.id);
                              }}
                              isDelete
                              hasDivider
                            />
                          </OverflowMenu>
                        )}
                        <ChevronRight size={16} className={styles.chevron} />
                      </div>
                    </div>
                    <div className={styles.setMeta}>
                      <Tag size="sm" type="gray">
                        {set.drugs.length} drugs
                      </Tag>
                      <span className={styles.setDescription}>{set.description}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className={styles.emptyMessage}>
            {t('noOrderSetsMatch', 'No order sets match "{{search}}"', { search })}
          </p>
        )}
      </div>
    </div>
  );
}
