import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tile } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { navigate, useLayoutType } from '@openmrs/esm-framework';
import type { OrderBasketExtensionProps } from '@openmrs/esm-patient-common-lib';
import styles from './fast-orders-basket-panel.scss';

/**
 * Extension slotted into order-basket-slot. Navigates to the full-page
 * Orders (Fast) dashboard (main content area) for a proper, unconstricted view.
 */
function FastOrdersBasketPanelExtension({ patient }: OrderBasketExtensionProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const patientUuid = patient?.id;

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
          <Add size={20} className={styles.icon} />
          <h4 className={styles.heading}>{t('fastOrders', 'Fast orders')}</h4>
        </div>
        <Button
          kind="ghost"
          size={isTablet ? 'md' : 'sm'}
          renderIcon={Add}
          onClick={openFastOrders}
          className={styles.addButton}
        >
          {t('open', 'Open')}
        </Button>
      </div>
    </Tile>
  );
}

export default FastOrdersBasketPanelExtension;
