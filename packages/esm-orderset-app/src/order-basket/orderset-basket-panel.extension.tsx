import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Add, ChevronUp, ChevronDown } from '@carbon/react/icons';
import { navigate, useLayoutType } from '@openmrs/esm-framework';
import type { OrderBasketExtensionProps } from '@openmrs/esm-patient-common-lib';
import { useOrdersetCart } from '../resources/orderset-cart.resource';
import { useOrderConfig } from '../resources/order-config.resource';
import OrdersetBasketItemTile from './orderset-basket-item-tile.component';
import OrdersetIcon from './orderset-icon.component';
import styles from './orderset-basket-panel.scss';

function OrdersetBasketPanelExtension({ patient }: OrderBasketExtensionProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const patientUuid = patient?.id;
  const { drugs, removeDrug } = useOrdersetCart();
  const { orderConfigObject } = useOrderConfig();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const openOrdersetDashboard = () => {
    if (!patientUuid) return;
    navigate({
      to: `\${openmrsSpaBase}/patient/\${patientUuid}/chart/Order%20Sets`,
      templateParams: { patientUuid },
    });
  };

  return (
    <Tile className={isTablet ? styles.tabletTile : styles.desktopTile}>
      <div className={isTablet ? styles.tabletContainer : styles.desktopContainer}>
        <div className={styles.iconAndLabel}>
          <OrdersetIcon isTablet={isTablet} />
          <h4 className={styles.heading}>
            {t('orderSets', 'Order Sets')} {drugs.length > 0 ? `(${drugs.length})` : ''}
          </h4>
        </div>
        <div className={styles.buttonContainer}>
          <Button
            kind="ghost"
            size={isTablet ? 'md' : 'sm'}
            renderIcon={Add}
            onClick={openOrdersetDashboard}
            className={styles.addButton}
          >
            {t('open', 'Open')}
          </Button>
          {drugs.length > 0 && (
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
      {isExpanded && drugs.length > 0 && (
        <div className={styles.items}>
          {drugs.map((drug) => (
            <OrdersetBasketItemTile
              key={drug.id}
              drug={drug}
              orderConfig={orderConfigObject}
              onItemClick={openOrdersetDashboard}
              onRemoveClick={() => removeDrug(drug.id)}
            />
          ))}
        </div>
      )}
    </Tile>
  );
}

export default OrdersetBasketPanelExtension;
