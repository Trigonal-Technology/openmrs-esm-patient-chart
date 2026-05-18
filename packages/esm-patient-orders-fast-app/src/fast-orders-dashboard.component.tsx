import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { useConfig, useSession, showSnackbar } from '@openmrs/esm-framework';
import {
  usePatientChartStore,
  useMutatePatientOrders,
  EmptyState,
  invalidateVisitAndEncounterData,
} from '@openmrs/esm-patient-common-lib';
import { useOrderConfig } from './resources/order-config.resource';
import { useFastOrdersCart } from './resources/fast-orders-cart.resource';
import { InlinePrescriptionBuilder } from './components/InlinePrescriptionBuilder';
import { PrescriptionBuilder } from './components/PrescriptionBuilder';
import { CartSidebar } from './components/CartSidebar';
import { submitOrdersOnNewEncounter } from './resources/order-api';
import { useSWRConfig } from 'swr';
import type { ConfigObject } from './config-schema';
import type { OrderRow } from './components/InlineOrderRow';
import type { OrderConfigObject } from './resources/order-config.resource';
import styles from './fast-orders-dashboard.scss';

// Removed local cartIdCounter and nextCartId - now in fast-orders-cart.resource.ts

function getTimesPerDay(freqValue: string, orderConfig: OrderConfigObject): number {
  const f = orderConfig.orderFrequencies.find((x) => x.valueCoded === freqValue);
  const v = (f as { value?: string })?.value?.toLowerCase() ?? '';
  if (v.includes('once') || v.includes('od')) return 1;
  if (v.includes('twice') || v.includes('bid')) return 2;
  if (v.includes('three') || v.includes('tid')) return 3;
  if (v.includes('four') || v.includes('qid')) return 4;
  return 1;
}

function getDurationDays(duration: number, durationUnits: string, orderConfig: OrderConfigObject): number {
  const u = orderConfig.durationUnits.find((x) => x.valueCoded === durationUnits);
  const v = (u as { value?: string })?.value?.toLowerCase() ?? '';
  if (v.includes('week')) return duration * 7;
  if (v.includes('month')) return duration * 30;
  return duration;
}

interface FastOrdersDashboardProps {
  patientUuid: string;
  patient: fhir.Patient;
}

export default function FastOrdersDashboard({ patientUuid, patient }: FastOrdersDashboardProps) {
  const { t } = useTranslation();
  const { orderEncounterType, drugOrderTypeUUID } = useConfig<ConfigObject>();
  const { sessionLocation, currentProvider } = useSession();
  const { visitContext } = usePatientChartStore(patientUuid);
  const { orderConfigObject, isLoading, error } = useOrderConfig();
  const { mutate: mutateOrders } = useMutatePatientOrders(patientUuid);
  const { mutate } = useSWRConfig();

  // Orderer must be the Provider UUID (not person UUID) for OpenMRS order validation
  const ordererUuid = currentProvider?.uuid ?? '';
  const orderLocationUuid = sessionLocation?.uuid ?? '';
  const visitUuid = visitContext?.uuid;

  const { cart, addToCart, updateCartItem, removeFromCart, clearCart, nextId } = useFastOrdersCart();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);

  const handleRemoveFromCart = useCallback(
    (id: string) => {
      removeFromCart(id);
      if (editingCartId === id) setEditingCartId(null);
    },
    [editingCartId, removeFromCart],
  );

  const handleClearCart = useCallback(() => {
    clearCart();
    setEditingCartId(null);
  }, [clearCart]);

  const validCartItems = cart.filter((r) => r.drug && r.dose && r.dose > 0 && r.duration && r.duration > 0);

  const handleSubmitAll = useCallback(async () => {
    if (!orderConfigObject || validCartItems.length === 0) return;
    setIsSubmittingCart(true);
    try {
      const payloads = validCartItems.map((r) => {
        const timesPerDay = getTimesPerDay(r.frequency, orderConfigObject);
        const days = getDurationDays(r.duration!, r.durationUnits, orderConfigObject);
        const qty = r.quantity ?? Math.ceil(timesPerDay * days);
        return {
          drugUuid: r.drug!.uuid,
          conceptUuid: r.drug!.concept,
          dose: r.dose!,
          doseUnits: r.doseUnits,
          route: r.route,
          frequency: r.frequency,
          asNeeded: r.asNeeded,
          quantity: qty,
          quantityUnits: r.doseUnits,
          duration: r.duration!,
          durationUnits: r.durationUnits,
        };
      });
      await submitOrdersOnNewEncounter(
        payloads,
        patientUuid,
        ordererUuid,
        orderEncounterType,
        orderLocationUuid,
        visitUuid,
      );
      handleClearCart();
      mutateOrders();
      invalidateVisitAndEncounterData(mutate, patientUuid);
      showSnackbar({
        kind: 'success',
        title: t('ordersPlaced', 'Orders placed'),
        subtitle: t('ordersSubmittedCount', '{{count}} order(s) submitted successfully', {
          count: validCartItems.length,
        }),
      });
    } catch (e) {
      showSnackbar({
        kind: 'error',
        title: t('errorPlacingOrders', 'Error placing orders'),
        subtitle: (e as Error)?.message ?? '',
      });
    } finally {
      setIsSubmittingCart(false);
    }
  }, [
    orderConfigObject,
    validCartItems,
    patientUuid,
    ordererUuid,
    orderEncounterType,
    orderLocationUuid,
    visitUuid,
    handleClearCart,
    mutateOrders,
    mutate,
    t,
  ]);

  const handleEditCartItem = useCallback((id: string) => {
    setEditingCartId(id);
    setActiveTabIndex(1);
  }, []);

  if (error) {
    return (
      <EmptyState
        headerTitle={t('fastOrders', 'Fast Orders')}
        displayText={t('errorLoadingOrderConfig', 'Error loading order config')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>{t('loading', 'Loading…')}</p>
      </div>
    );
  }

  const commonProps = {
    patientUuid,
    orderConfig: orderConfigObject,
    orderEncounterType,
    orderLocationUuid,
    ordererUuid,
    visitUuid,
    mutateOrders,
    drugOrderTypeUuid: drugOrderTypeUUID,
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.main}>
        <Tabs selectedIndex={activeTabIndex} onChange={(e) => setActiveTabIndex(e.selectedIndex)}>
          <TabList aria-label={t('orderEntryTabs', 'Order entry tabs')} className={styles.tabList}>
            <Tab className={styles.tab}>{t('singleOrderForm', 'Single Order Form')}</Tab>
            <Tab className={styles.tab}>{t('orderBasket', 'Order Basket')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <PrescriptionBuilder
                {...commonProps}
                cart={cart}
                addToCart={addToCart}
                updateCartItem={updateCartItem}
                editingCartId={editingCartId}
                onClearEditing={() => setEditingCartId(null)}
                onEditCartItem={handleEditCartItem}
              />
            </TabPanel>
            <TabPanel>
              <InlinePrescriptionBuilder
                {...commonProps}
                cart={cart}
                addToCart={addToCart}
                updateRow={updateCartItem}
                removeRow={handleRemoveFromCart}
                clearCart={handleClearCart}
                nextId={nextId}
                onSubmitAll={handleSubmitAll}
                isSubmittingCart={isSubmittingCart}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
      <CartSidebar
        cart={cart}
        orderConfig={orderConfigObject}
        onEditItem={handleEditCartItem}
        onRemoveItem={handleRemoveFromCart}
        onSubmitAll={handleSubmitAll}
        isSubmitting={isSubmittingCart}
        validCount={validCartItems.length}
      />
    </div>
  );
}
