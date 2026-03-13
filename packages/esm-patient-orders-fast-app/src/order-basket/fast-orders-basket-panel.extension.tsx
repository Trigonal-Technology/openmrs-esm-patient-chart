import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Add, ChevronUp, ChevronDown } from '@carbon/react/icons';
import { navigate, useLayoutType } from '@openmrs/esm-framework';
import type { OrderBasketExtensionProps } from '@openmrs/esm-patient-common-lib';
import { useFastOrdersCart } from '../resources/fast-orders-cart.resource';
import { useOrderConfig } from '../resources/order-config.resource';
import FastOrderBasketItemTile from './fast-order-basket-item-tile.component';
import styles from './fast-orders-basket-panel.scss';
import FastDrugIcon from './fast-orders-icon.component';

/**
 * Extension slotted into order-basket-slot. Navigates to the full-page
 * Orders (Fast) dashboard (main content area) for a proper, unconstricted view.
 */
function FastOrdersBasketPanelExtension({ patient }: OrderBasketExtensionProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const patientUuid = patient?.id;
  const { cart, removeFromCart } = useFastOrdersCart();
  const { orderConfigObject } = useOrderConfig();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const openFastOrders = () => {
    if (!patientUuid) return;
    navigate({
      to: `\${openmrsSpaBase}/patient/\${patientUuid}/chart/Orders%20(Fast)`,
      templateParams: { patientUuid },
    });
  };

  return (
    <Tile className={isTablet ? styles.tabletTile : styles.desktopTile}>
      <div className={isTablet ? styles.tabletContainer : styles.desktopContainer}>
        <div className={styles.iconAndLabel}>
          <FastDrugIcon isTablet={isTablet} />
          <h4 className={styles.heading}>
            {t('fastOrders', 'Fast orders')} {cart.length > 0 ? `(${cart.length})` : ''}
          </h4>
        </div>
        <div className={styles.buttonContainer}>
          <Button
            kind="ghost"
            size={isTablet ? 'md' : 'sm'}
            renderIcon={Add}
            onClick={openFastOrders}
            className={styles.addButton}
          >
            {t('open', 'Open')}
          </Button>
          {cart.length > 0 && (
            <Button
              kind="ghost"
              hasIconOnly
              size={isTablet ? 'md' : 'sm'}
              renderIcon={isExpanded ? ChevronUp : ChevronDown}
              onClick={() => setIsExpanded(!isExpanded)}
              iconDescription={isExpanded ? t('collapse', 'Collapse') : t('expand', 'Expand')}
            />
          )}
        </div>
      </div>
      {isExpanded && cart.length > 0 && (
        <div className={styles.items}>
          {cart.map((row) => (
            <FastOrderBasketItemTile
              key={row.id}
              row={row}
              orderConfig={orderConfigObject}
              onItemClick={openFastOrders}
              onRemoveClick={() => removeFromCart(row.id)}
            />
          ))}
        </div>
      )}
    </Tile>
  );
}

export default FastOrdersBasketPanelExtension;
