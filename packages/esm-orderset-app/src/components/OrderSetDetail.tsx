import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tag, Tile, Link } from '@carbon/react';
import { ArrowLeft, ArrowRight, Edit, TrashCan, Medication, Scalpel, ImageMedical, Microscope, ToolBox } from '@carbon/react/icons';
import type { OrderSet, OrderMemberType } from '../resources/orderset-config';
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

const getMemberIcon = (type: OrderMemberType) => {
  switch (type) {
    case 'DRUG': return <Medication size={20} className={styles.drugIcon} />;
    case 'LAB': return <Microscope size={20} className={styles.drugIcon} />;
    case 'RADIOLOGY': return <ImageMedical size={20} className={styles.drugIcon} />;
    case 'PROCEDURE': return <Scalpel size={20} className={styles.drugIcon} />;
    case 'MEDICAL_SUPPLY': return <ToolBox size={20} className={styles.drugIcon} />;
    default: return <Medication size={20} className={styles.drugIcon} />;
  }
};

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
              <strong>{t('totalItems', 'Total Items')}:</strong> {set.members.length}
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
          <h2 className={styles.sectionTitle}>{t('orderItems', 'Order Items')}</h2>

          <div className={styles.drugList}>
            {set.members.map((item) => (
              <Tile key={item.id} className={styles.drugCard}>
                <div className={styles.drugHeader}>
                  <div className={styles.drugNameRow}>
                    {getMemberIcon(item.memberType)}
                    <span className={styles.drugName}>{item.drugName}</span>
                    <Tag type={item.memberType === 'DRUG' ? 'teal' : 'purple'} size="sm" className={styles.typeTag}>
                      {item.memberType}
                    </Tag>
                  </div>
                  {item.memberType === 'DRUG' && item.dose && (
                    <div className={styles.drugTags}>
                      <Tag type="teal" size="sm">{item.dose} {getDisplayForConfig(orderConfig?.drugDosingUnits ?? [], item.doseUnit || '')}</Tag>
                    </div>
                  )}
                </div>

                <div className={styles.drugDetails}>
                  {item.memberType === 'DRUG' ? (
                    <p>
                      <strong>{t('dose', 'Dose')}:</strong> {item.dose} {getDisplayForConfig(orderConfig?.drugDosingUnits ?? [], item.doseUnit || '')}
                      <span className={styles.detailDivider}>|</span>
                      <strong>{getDisplayForConfig(orderConfig?.orderFrequencies ?? [], item.frequency || '')}</strong> - {item.duration} {getDisplayForConfig(orderConfig?.durationUnits ?? [], item.durationUnit || '')}
                      {item.quantity && (
                        <>
                          <span className={styles.detailDivider}>|</span>
                          <strong>{t('qty', 'Qty')}:</strong> {item.quantity} {item.quantityUnits}
                        </>
                      )}
                      {item.numRefills !== undefined && item.numRefills > 0 && (
                        <>
                          <span className={styles.detailDivider}>|</span>
                          <strong>{t('refills', 'Refills')}:</strong> {item.numRefills}
                        </>
                      )}
                      {item.asNeeded && (
                        <>
                          <span className={styles.detailDivider}>|</span>
                          <strong>{t('prn', 'PRN')}</strong> {item.asNeededCondition && `(${item.asNeededCondition})`}
                        </>
                      )}
                    </p>
                  ) : item.memberType === 'PROCEDURE' ? (
                    <p>
                      {item.numberOfRepeats && (
                        <>
                          <strong>{t('repeats', 'Repeats')}:</strong> {item.numberOfRepeats}
                          {item.instructions && <span className={styles.detailDivider}>|</span>}
                        </>
                      )}
                      {item.instructions && (
                        <>
                          <strong>{t('instructions', 'Instructions')}:</strong> {item.instructions}
                        </>
                      )}
                    </p>
                  ) : item.memberType === 'MEDICAL_SUPPLY' ? (
                    <p>
                      <strong>{t('qty', 'Qty')}:</strong> {item.quantity} {item.quantityUnits}
                      {item.instructions && (
                        <>
                          <span className={styles.detailDivider}>|</span>
                          <strong>{t('instructions', 'Instructions')}:</strong> {item.instructions}
                        </>
                      )}
                    </p>
                  ) : (
                    <p>
                      {item.instructions && (
                        <>
                          <strong>{t('instructions', 'Instructions')}:</strong> {item.instructions}
                        </>
                      )}
                    </p>
                  )}
                  {item.memberType === 'DRUG' && item.instructions && (
                    <p className={styles.itemInstructions}>
                      <strong>{t('instructions', 'Instructions')}:</strong> {item.instructions}
                    </p>
                  )}
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
              <span className={styles.infoValue}>{isCustom ? t('currentUser', 'Current User') : t('system', 'System')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

