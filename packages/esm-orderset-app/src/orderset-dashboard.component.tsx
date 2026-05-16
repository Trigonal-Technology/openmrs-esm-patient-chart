import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import { Add, Save, ArrowRight, ArrowLeft } from '@carbon/react/icons';
import { useConfig, useSession, showSnackbar } from '@openmrs/esm-framework';
import { usePatientChartStore, EmptyState } from '@openmrs/esm-patient-common-lib';
import { useOrderConfig } from './resources/order-config.resource';
import { useOrdersetCart } from './resources/orderset-cart.resource';
import { defaultOrderSets } from './resources/orderset-config';
import type { OrderSet } from './resources/orderset-config';
import type { ConfigObject } from './config-schema';
import DrugOrderEditor from './components/DrugOrderEditor';
import CreateOrderSetForm from './components/CreateOrderSetForm';
import styles from './orderset-dashboard.scss';
import { OrderSetHeader } from './header/orderset-header.component';
import OrderSetList from './components/OrderSetList';
import OrderSetDetail from './components/OrderSetDetail';

type Step = 'list' | 'detail' | 'edit' | 'save-set';

interface OrdersetDashboardProps {
  patientUuid: string;
  patient: fhir.Patient;
}

export default function OrdersetDashboard({ patientUuid, patient }: OrdersetDashboardProps) {
  const { t } = useTranslation();
  const { orderEncounterType } = useConfig<ConfigObject>();
  const { sessionLocation, currentProvider } = useSession();
  const { visitContext } = usePatientChartStore(patientUuid);

  const ordererUuid = currentProvider?.uuid ?? '';
  const orderLocationUuid = sessionLocation?.uuid ?? '';
  const visitUuid = visitContext?.uuid;

  const { orderConfigObject, isLoading, error } = useOrderConfig();
  const { selectedSet, drugs, customSets, selectSet, setDrugs, addCustomSet, removeCustomSet, clearSelection } =
    useOrdersetCart();

  const [step, setStep] = useState<Step>('list');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const allSets = [...defaultOrderSets, ...customSets];

  const handleSelectSet = useCallback(
    (set: OrderSet) => {
      selectSet(set);
      setStep('detail');
      setIsCreatingNew(false);
    },
    [selectSet],
  );

  const handleUseSet = useCallback(() => {
    setStep('edit');
  }, []);

  const handleCreateNew = useCallback(() => {
    selectSet({
      id: 'new-draft',
      name: 'New Order Set',
      category: '',
      description: '',
      drugs: [],
    });
    setStep('edit');
    setIsCreatingNew(true);
  }, [selectSet]);

  const handleEditSet = useCallback(
    (set: OrderSet) => {
      selectSet(set);
      setStep('edit');
      setIsCreatingNew(true);
    },
    [selectSet],
  );

  const handleDeleteSet = useCallback(
    (setId: string) => {
      removeCustomSet(setId);
      clearSelection();
      setStep('edit');
      setIsCreatingNew(false);
    },
    [removeCustomSet, clearSelection],
  );

  const handleSaveOrderSet = useCallback(
    (newSet: OrderSet) => {
      addCustomSet(newSet);
      selectSet(newSet);
      setStep('edit');
      setIsCreatingNew(false);
      showSnackbar({
        isLowContrast: true,
        title: t('orderSetSaved', 'Order set saved'),
        kind: 'success',
        subtitle: t('orderSetSavedSuccess', 'The order set has been saved successfully.'),
      });
    },
    [addCustomSet, selectSet, t],
  );

  const handleDrugsChange = useCallback(
    (newDrugs: typeof drugs) => {
      setDrugs(newDrugs);
    },
    [setDrugs],
  );

  const handleSubmit = useCallback(() => {
    clearSelection();
    setStep('list');
    setIsCreatingNew(false);
  }, [clearSelection]);

  const handleBack = useCallback(() => {
    if (step === 'save-set') {
      setStep('edit');
      return;
    }
    if (step === 'detail') {
      clearSelection();
      setStep('list');
      return;
    }
    // edit -> detail (if existing set) or list (if new)
    if (isCreatingNew) {
      clearSelection();
      setIsCreatingNew(false);
      setStep('list');
    } else {
      setStep('detail');
    }
  }, [step, clearSelection, isCreatingNew]);

  if (error) {
    return (
      <EmptyState
        headerTitle={t('orderSets', 'Order Sets')}
        displayText={t('errorLoadingOrderConfig', 'Error loading order config')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <InlineLoading status="active" description={t('loading', 'Loading…')} />
      </div>
    );
  }

  return (
    <div className={`omrs-main-content`}>
      <OrderSetHeader />
      <div className={styles.wrapper}>
        {!['list', 'detail'].includes(step) && (
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <Button kind="ghost" size="sm" onClick={handleBack} className={styles.backButton}>
                <ArrowLeft size={16} className={styles.backIcon} />
                {t('back', 'Back')}
              </Button>
            </div>
            <div className={styles.headerRight}>
              {selectedSet && step === 'edit' && isCreatingNew && drugs.length > 0 && (
                <Button size="sm" kind="primary" renderIcon={Save} onClick={() => setStep('save-set')}>
                  {t('saveAsOrderSet', 'Save Order Set')}
                </Button>
              )}
            </div>
          </header>
        )}
        <main className={styles.main}>
          <div className={styles.content}>
            {step === 'list' ? (
              <OrderSetList
                orderSets={allSets}
                customSetIds={new Set(customSets.map((s) => s.id))}
                onOpen={handleSelectSet}
                onEdit={handleEditSet}
                onDelete={handleDeleteSet}
                onCreateNew={handleCreateNew}
                orderConfig={orderConfigObject}
              />
            ) : step === 'detail' && selectedSet ? (
              <OrderSetDetail
                set={selectedSet}
                isCustom={customSets.some((s) => s.id === selectedSet.id)}
                orderConfig={orderConfigObject}
                onEdit={handleEditSet}
                onDelete={handleDeleteSet}
                onBack={handleBack}
              />
            ) : !selectedSet ? (
              <div className={styles.emptyState}>
                <Add size={40} className={styles.emptyStateIcon} />
                <p className="cds--type-body-compact-01">
                  {t('selectOrderSet', 'Select an order set or create a new one')}
                </p>
              </div>
            ) : step === 'save-set' ? (
              <CreateOrderSetForm
                drugs={drugs}
                orderConfig={orderConfigObject}
                onSave={handleSaveOrderSet}
                onCancel={() => setStep('edit')}
              />
            ) : step === 'edit' ? (
              <DrugOrderEditor
                drugs={drugs}
                onChange={handleDrugsChange}
                orderConfig={orderConfigObject}
                orderSetName={isCreatingNew ? 'New Order Set (unsaved)' : selectedSet.name}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
