import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { ClickableTile, IconButton } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { useLayoutType } from '@openmrs/esm-framework';
import type { OrderRow } from '../components/InlineOrderRow';
import type { OrderConfigObject } from '../resources/order-config.resource';
import styles from './fast-order-basket-item-tile.scss';

interface FastOrderBasketItemTileProps {
    row: OrderRow;
    orderConfig: OrderConfigObject;
    onItemClick: () => void;
    onRemoveClick: () => void;
}

export default function FastOrderBasketItemTile({
    row,
    orderConfig,
    onItemClick,
    onRemoveClick,
}: FastOrderBasketItemTileProps) {
    const { t } = useTranslation();
    const isTablet = useLayoutType() === 'tablet';
    const shouldOnClickBeCalled = useRef(true);

    const route = orderConfig?.drugRoutes.find((r) => r.valueCoded === row.route);
    const freq = orderConfig?.orderFrequencies.find((f) => f.valueCoded === row.frequency);
    const doseUnit = orderConfig?.drugDosingUnits.find((u) => u.valueCoded === row.doseUnits);
    const durationUnit = orderConfig?.durationUnits.find((u) => u.valueCoded === row.durationUnits);

    return (
        <ClickableTile
            role="listitem"
            className={classNames({
                [styles.clickableTileTablet]: isTablet,
                [styles.clickableTileDesktop]: !isTablet,
            })}
            onClick={() => shouldOnClickBeCalled.current && onItemClick()}
        >
            <div className={styles.orderBasketItemTile}>
                <div className={styles.clipTextWithEllipsis}>
                    <span className={styles.orderActionNewLabel}>{t('orderActionNew', 'New')}</span>
                    <div>
                        <span className={styles.drugName}>{row.drug?.name ?? t('unknownDrug', 'Unknown drug')}</span>
                    </div>
                    <div className={styles.dosageInfo}>
                        <span className={styles.label01}>
                            {t('dose', 'DOSE').toUpperCase()} {row.dose ?? '--'} {doseUnit?.value ?? ''}{' '}
                            &mdash; {route?.value ?? '--'} &mdash; {freq ? (freq as { value?: string }).value : '--'}{' '}
                            &mdash; {t('quantity', 'QUANTITY').toUpperCase()} {row.quantity ?? '--'}{' '}
                            {doseUnit?.value ?? ''}
                        </span>
                    </div>
                </div>
                <IconButton
                    kind="ghost"
                    align="left"
                    size={isTablet ? 'lg' : 'sm'}
                    label={t('removeFromBasket', 'Remove from basket')}
                    onClick={() => {
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
