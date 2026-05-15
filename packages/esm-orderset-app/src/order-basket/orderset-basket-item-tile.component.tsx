import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { ClickableTile, IconButton } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { useLayoutType } from '@openmrs/esm-framework';
import type { DrugOrderItem } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import styles from './orderset-basket-item-tile.scss';

import { getDisplayForConfig } from '../lib/order-config-utils';

interface OrdersetBasketItemTileProps {
  drug: DrugOrderItem;
  orderConfig: OrderConfigObject;
  onItemClick: () => void;
  onRemoveClick: () => void;
}

export default function OrdersetBasketItemTile({
  drug,
  orderConfig,
  onItemClick,
  onRemoveClick,
}: OrdersetBasketItemTileProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const shouldOnClickBeCalled = useRef(true);

  const doseUnit = getDisplayForConfig(orderConfig?.drugDosingUnits ?? [], drug.doseUnit);
  const route = getDisplayForConfig(orderConfig?.drugRoutes ?? [], drug.route);
  const freq = getDisplayForConfig(orderConfig?.orderFrequencies ?? [], drug.frequency);

  return (
    <ClickableTile
      role="listitem"
      className={classNames({
        [styles.clickableTileTablet]: isTablet,
        [styles.clickableTileDesktop]: !isTablet,
      })}
      onClick={() => shouldOnClickBeCalled.current && onItemClick()}
    >
      <div className={styles.tileContent}>
        <div className={styles.clipText}>
          <span className={styles.newLabel}>{t('orderActionNew', 'New')}</span>
          <span className={styles.drugName}>{drug.drugName}</span>
          <div className={styles.dosageInfo}>
            {t('dose', 'DOSE')} {drug.dose ?? '--'} {doseUnit} — {route} — {freq}
          </div>
        </div>
        <IconButton
          kind="ghost"
          align="left"
          size={isTablet ? 'lg' : 'sm'}
          label={t('removeFromBasket', 'Remove from basket')}
          onClick={(e) => {
            e.stopPropagation();
            shouldOnClickBeCalled.current = false;
            onRemoveClick();
          }}
        >
          <TrashCan size={16} className={styles.removeButton} />
        </IconButton>
      </div>
    </ClickableTile>
  );
}
