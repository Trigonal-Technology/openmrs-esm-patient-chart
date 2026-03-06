import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Send } from '@carbon/react/icons';
import type { OrderRow } from './InlineOrderRow';
import type { OrderConfigObject } from '../resources/order-config.resource';
import styles from './cart-sidebar.scss';

function rowSummary(row: OrderRow, orderConfig: OrderConfigObject): string {
  if (!row.drug) return '—';
  const route = orderConfig.drugRoutes.find((r) => r.valueCoded === row.route);
  const freq = orderConfig.orderFrequencies.find((f) => f.valueCoded === row.frequency);
  const dur = orderConfig.durationUnits.find((u) => u.valueCoded === row.durationUnits);
  let s = row.drug.name;
  if (row.dose) s += ` ${row.dose}`;
  if (route) s += ` ${route.value}`;
  if (freq) s += ` ${(freq as { value?: string }).value ?? ''}`;
  if (row.duration && dur) s += ` × ${row.duration} ${dur.value}`;
  return s;
}

interface CartSidebarProps {
  cart: OrderRow[];
  orderConfig: OrderConfigObject;
  onEditItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onSubmitAll: () => void;
  isSubmitting: boolean;
  validCount: number;
}

export function CartSidebar({
  cart,
  orderConfig,
  onEditItem,
  onRemoveItem,
  onSubmitAll,
  isSubmitting,
  validCount,
}: CartSidebarProps) {
  const { t } = useTranslation();

  if (cart.length === 0) {
    return (
      <aside className={styles.sidebar}>
        <h3 className={styles.title}>{t('cart', 'Cart')}</h3>
        <p className={styles.empty}>{t('cartEmpty', 'No items in cart')}</p>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>
        {t('cart', 'Cart')} <span className={styles.count}>({cart.length})</span>
      </h3>
      <ul className={styles.list}>
        {cart.map((row) => (
          <li key={row.id} className={styles.item}>
            <button
              type="button"
              className={styles.itemButton}
              onClick={() => onEditItem(row.id)}
              title={t('clickToEdit', 'Click to edit')}
            >
              <span className={styles.itemSummary}>{rowSummary(row, orderConfig)}</span>
            </button>
            <button
              type="button"
              className={styles.removeButton}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(row.id);
              }}
              aria-label={t('remove', 'Remove')}
              title={t('remove', 'Remove')}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <span className={styles.validCount}>
          {validCount} of {cart.length} {t('valid', 'valid')}
        </span>
        <Button
          kind="primary"
          size="md"
          onClick={onSubmitAll}
          disabled={validCount === 0 || isSubmitting}
          renderIcon={Send}
          className={styles.submitAll}
        >
          {isSubmitting ? t('submitting', 'Submitting…') : t('submitAll', 'Submit all')}
        </Button>
      </div>
    </aside>
  );
}
