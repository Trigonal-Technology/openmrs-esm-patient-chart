import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkmark, Warning, Send } from '@carbon/react/icons';
import { Button, InlineNotification, Modal } from '@carbon/react';
import { useMutatePatientOrders, invalidateVisitAndEncounterData } from '@openmrs/esm-patient-common-lib';
import { showSnackbar } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import type { OrderItem } from '../resources/orderset-config';
import type { OrderConfigObject } from '../resources/order-config.resource';
import { submitOrdersOnNewEncounter, type FastOrderPayload } from '../resources/order-api';
import { resolveDrugByName } from '../resources/drug-resolver';
import { calculateAutoQuantity } from '../lib/quantityCalculator';
import styles from './order-review.scss';

import { findValueCodedByDisplay } from '../lib/order-config-utils';

interface OrderReviewProps {
  drugs: OrderItem[];
  orderSetName: string;
  orderConfig: OrderConfigObject;
  patientUuid: string;
  ordererUuid: string;
  orderEncounterType: string;
  orderLocationUuid: string;
  visitUuid?: string;
  onSubmit: () => void;
  onBack: () => void;
}

export default function OrderReview({
  drugs,
  orderSetName,
  orderConfig,
  patientUuid,
  ordererUuid,
  orderEncounterType,
  orderLocationUuid,
  visitUuid,
  onSubmit,
  onBack,
}: OrderReviewProps) {
  const { t } = useTranslation();
  const { mutate: mutateOrders } = useMutatePatientOrders(patientUuid);
  const { mutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getQuantityForDrug = (d: OrderItem) => {
    if (d.memberType !== 'DRUG' || d.dose === undefined) return 0;
    const freqCoded = findValueCodedByDisplay(orderConfig.orderFrequencies, d.frequency || '');
    const durUnitCoded = findValueCodedByDisplay(orderConfig.durationUnits, d.durationUnit || '');
    const qty = calculateAutoQuantity(d.dose, freqCoded, d.duration || 0, durUnitCoded, orderConfig);
    return qty ?? Math.ceil((d.duration || 0) * 2); // fallback
  };

  const hasZeroDose = drugs.some((d) => d.memberType === 'DRUG' && d.dose === 0);
  const duplicates = drugs.filter(
    (d, i, arr) => arr.findIndex((x) => x.drugName === d.drugName) !== i,
  );
  const hasIssues = hasZeroDose || duplicates.length > 0;

  const getDisplayForRoute = (valueCoded: string) => {
    const r = orderConfig.drugRoutes.find((x) => x.valueCoded === valueCoded);
    return r?.value ?? valueCoded;
  };

  const getDisplayForFreq = (valueCoded: string) => {
    const f = orderConfig.orderFrequencies.find((x) => x.valueCoded === valueCoded);
    return (f as { value?: string })?.value ?? valueCoded;
  };

  const getDisplayForDoseUnit = (valueCoded: string) => {
    const u = orderConfig.drugDosingUnits.find((x) => x.valueCoded === valueCoded);
    return u?.value ?? valueCoded;
  };

  const getDisplayForDurUnit = (valueCoded: string) => {
    const u = orderConfig.durationUnits.find((x) => x.valueCoded === valueCoded);
    return u?.value ?? valueCoded;
  };

  const handleSubmit = useCallback(async () => {
    if (drugs.length === 0 || hasIssues) return;
    setIsSubmitting(true);
    setResolveError(null);

    try {
      const payloads: FastOrderPayload[] = [];
      const unresolved: string[] = [];

      for (const d of drugs) {
        if (d.memberType === 'DRUG') {
          const resolved = await resolveDrugByName(d.drugName);
          if (!resolved) {
            unresolved.push(d.drugName);
            continue;
          }

          const routeCoded = findValueCodedByDisplay(orderConfig.drugRoutes, d.route || '');
          const freqCoded = findValueCodedByDisplay(orderConfig.orderFrequencies, d.frequency || '');
          const doseUnitCoded = findValueCodedByDisplay(orderConfig.drugDosingUnits, d.doseUnit || '');
          const durUnitCoded = findValueCodedByDisplay(orderConfig.durationUnits, d.durationUnit || '');

          const quantity = getQuantityForDrug(d);

          payloads.push({
            drugUuid: resolved.uuid,
            conceptUuid: resolved.conceptUuid,
            dose: d.dose || 0,
            doseUnits: doseUnitCoded,
            route: routeCoded,
            frequency: freqCoded,
            asNeeded: false,
            quantity,
            quantityUnits: doseUnitCoded,
            duration: d.duration || 0,
            durationUnits: durUnitCoded,
            dosingInstructions: d.instructions ?? undefined,
          });
        } else {
          // Non-drug items: Procedures, Labs, etc.
          // For now, we only handle drug orders in the submit API.
          // We might need to add support for other order types later.
          console.warn(`Order type ${d.memberType} not yet supported for submission`);
        }
      }

      if (unresolved.length > 0) {
        setResolveError(t('drugsNotFound', 'Could not find drugs: {{names}}', { names: unresolved.join(', ') }));
        setIsSubmitting(false);
        return;
      }

      await submitOrdersOnNewEncounter(
        payloads,
        patientUuid,
        ordererUuid,
        orderEncounterType,
        orderLocationUuid,
        visitUuid,
      );

      mutateOrders();
      invalidateVisitAndEncounterData(mutate, patientUuid);
      showSnackbar({
        kind: 'success',
        title: t('ordersSubmitted', 'Orders submitted'),
        subtitle: t('ordersSubmittedCount', '{{count}} order(s) submitted successfully', {
          count: payloads.length,
        }),
      });
      onSubmit();
    } catch (e) {
      showSnackbar({
        kind: 'error',
        title: t('errorPlacingOrders', 'Error placing orders'),
        subtitle: (e as Error)?.message ?? '',
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  }, [
    drugs,
    hasIssues,
    orderConfig,
    patientUuid,
    ordererUuid,
    orderEncounterType,
    orderLocationUuid,
    visitUuid,
    onSubmit,
    mutateOrders,
    mutate,
    t,
  ]);

  const isIv = (routeCoded: string) => {
    const r = orderConfig.drugRoutes.find((x) => x.valueCoded === routeCoded);
    return r?.value?.toLowerCase().includes('iv') ?? false;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Checkmark size={20} className={styles.successIcon} />
        <h2 className={styles.title}>{t('reviewOrders', 'Review Orders')}</h2>
      </div>

      <div className={styles.content}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>{t('orderSet', 'Order Set')}</p>
          <p className={styles.summaryName}>{orderSetName}</p>
          <p className={styles.summaryMeta}>{drugs.length} medications</p>
        </div>

        {resolveError && (
          <InlineNotification
            kind="error"
            title={t('resolutionError', 'Drug resolution error')}
            subtitle={resolveError}
            lowContrast
            onClose={() => setResolveError(null)}
          />
        )}

        {hasIssues && (
          <div className={styles.issuesCard}>
            <Warning size={20} className={styles.warningIcon} />
            <div className={styles.issuesText}>
              {hasZeroDose && <p>{t('someDrugsZeroDose', 'Some drugs have a dose of 0.')}</p>}
              {duplicates.length > 0 && (
                <p>
                  {t('duplicateDrugs', 'Duplicate drugs:')}{' '}
                  {[...new Set(duplicates.map((d) => d.drugName))].join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className={styles.separator} />

        {drugs.map((drug, idx) => {
          const routeDisplay = getDisplayForRoute(drug.route);
          return (
            <div
              key={drug.id}
              className={`${styles.drugCard} ${drug.dose === 0 ? styles.drugCardInvalid : ''}`}
            >
              <div className={styles.drugHeader}>
                <div className={styles.drugTitle}>
                  <span className={styles.drugIndex}>{idx + 1}.</span>
                  <span className={styles.drugName}>{drug.drugName}</span>
                </div>
                <span className={`${styles.routeBadge} ${isIv(drug.route) ? styles.routeBadgeIv : ''}`}>
                  {routeDisplay}
                </span>
              </div>
              <div className={styles.drugDetails}>
                <p>
                  <span className={styles.doseText}>
                    {drug.dose} {getDisplayForDoseUnit(drug.doseUnit)}
                  </span>
                  {' · '}
                  {getDisplayForFreq(drug.frequency)}
                  {' · '}
                  {drug.duration} {getDisplayForDurUnit(drug.durationUnit)}
                </p>
                <p className={styles.quantityText}>
                  <strong>{t('dispense', 'Dispense:')}</strong> {getQuantityForDrug(drug)} {getDisplayForDoseUnit(drug.doseUnit)}
                </p>
                {drug.instructions && (
                  <p className={styles.instructions}>📝 {drug.instructions}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Button kind="secondary" size="sm" onClick={onBack} disabled={isSubmitting}>
          ← {t('editOrders', 'Edit Orders')}
        </Button>
        <Button
          size="sm"
          onClick={() => setShowConfirmModal(true)}
          disabled={drugs.length === 0 || hasIssues || isSubmitting}
          renderIcon={Send}
          className={styles.submitButton}
        >
          {t('submitOrders', 'Submit {{count}} Orders', { count: drugs.length })}
        </Button>
      </div>

      {showConfirmModal && (
        <Modal
          open={showConfirmModal}
          modalHeading={t('confirmOrderSubmission', 'Confirm Order Submission')}
          primaryButtonText={isSubmitting ? t('submitting', 'Submitting…') : t('submit', 'Submit')}
          secondaryButtonText={t('cancel', 'Cancel')}
          onRequestClose={() => setShowConfirmModal(false)}
          onRequestSubmit={handleSubmit}
          primaryButtonDisabled={isSubmitting}
        >
          <p style={{ marginBottom: '1rem' }}>
            {t(
              'confirmSubmissionMessage',
              'You are about to submit {{count}} medication orders to the patient chart. Do you want to continue?',
              { count: drugs.length }
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
