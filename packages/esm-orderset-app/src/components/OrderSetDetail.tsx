import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tag, Tile, Link } from '@carbon/react';
import { ArrowLeft, ArrowRight, Edit, TrashCan, Medication } from '@carbon/react/icons';
import type { OrderSet } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { getDisplayForConfig } from '../lib/order-config-utils';
import styles from './order-set-detail.scss';

interface OrderSetDetailProps {
  set: OrderSet;
  isCustom: boolean;
  orderConfig?: OrderConfigObject;
  onBack: () => void;
  onEdit: (set: OrderSet) => void;
  onDelete: (setId: string) => void;
}

export default function OrderSetDetail({
  set,
  isCustom,
  orderConfig,
  onBack,
  onEdit,
  onDelete,
}: OrderSetDetailProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.backNav}>
        <Button kind="ghost" size="sm" onClick={onBack} className={styles.backButton}>
          <ArrowLeft size={16} className={styles.backArrow} />
          {t('backToOrderSets', 'Back to Order Sets')}
        </Button>
      </div>

      <div className={styles.headerArea}>
        <div className={styles.titleContent}>
          <h1 className={styles.title}>{set.name}</h1>
          <p className={styles.description}>{set.description}</p>
          <div className={styles.metadata}>
            <span className={styles.metaLabel}><strong>Category:</strong> {set.category}</span>
            <span className={styles.metaLabel}>
              <Medication size={16} className={styles.metaIcon} />
              <strong>Drugs:</strong> {set.drugs.length}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <>
            <Button size="sm" kind="ghost" className={styles.editButton} onClick={() => onEdit(set)}>
              {t('edit', 'Edit')}
            </Button>
            <Button size="sm" kind="ghost" className={styles.deleteButton} onClick={() => onDelete(set.id)}>
              {t('delete', 'Delete')}
            </Button>
          </>

        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <h2 className={styles.sectionTitle}>{t('drugOrders', 'Drug Orders')}</h2>

          <div className={styles.drugList}>
            {set.drugs.map((drug) => (
              <Tile key={drug.id} className={styles.drugCard}>
                <div className={styles.drugHeader}>
                  <div className={styles.drugNameRow}>
                    <Medication size={20} className={styles.drugIcon} />
                    <span className={styles.drugName}>{drug.drugName}</span>
                  </div>
                  <div className={styles.drugTags}>
                    <Tag type="teal" size="sm">{drug.dose} {getDisplayForConfig(orderConfig?.drugDosingUnits ?? [], drug.doseUnit)}</Tag>
                  </div>
                </div>

                <div className={styles.drugDetails}>
                  <p>
                    <strong>{t('dose', 'Dose')}:</strong> {drug.dose} {getDisplayForConfig(orderConfig?.drugDosingUnits ?? [], drug.doseUnit)}
                    <span className={styles.detailDivider}>|</span>
                    <strong>{getDisplayForConfig(orderConfig?.orderFrequencies ?? [], drug.frequency)}</strong> - {drug.duration} {getDisplayForConfig(orderConfig?.durationUnits ?? [], drug.durationUnit)}
                  </p>
                </div>
              </Tile>
            ))}
          </div>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.infoPanel}>
            <h2 className={styles.infoTitle}>{t('orderSetInformation', 'Order Set Information')}</h2>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('category', 'Category')}:</span>
              <span className={styles.infoValue}>{set.category}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('applicableFor', 'Applicable For')}:</span>
              <span className={styles.infoValue}>{t('adults', 'Adults')}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('createdBy', 'Created By')}:</span>
              <span className={styles.infoValue}>{isCustom ? t('currentUser', 'Current User') : t('system', 'Super Man')}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('createdOn', 'Created On')}:</span>
              <span className={styles.infoValue}>12 March 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
