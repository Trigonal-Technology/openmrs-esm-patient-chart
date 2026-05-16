import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  PageHeaderContent,
  ExtensionSlot,
  Assessment1Pictogram,
  Pharmacy2Pictogram,
} from '@openmrs/esm-framework';

import styles from './orderset-header.scss';

export const OrderSetHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.pageHeader}>
      <PageHeader className={styles.PageHeader} data-testid="patient-queue-header">
        <PageHeaderContent illustration={<Pharmacy2Pictogram />} title={t('ordersets', 'Order Sets')} />{' '}
        <div className={styles.pageHeaderActions}>
          <ExtensionSlot className={styles.providerBannerInfoSlot} name="provider-banner-info-slot" />
        </div>
      </PageHeader>
    </div>
  );
};
