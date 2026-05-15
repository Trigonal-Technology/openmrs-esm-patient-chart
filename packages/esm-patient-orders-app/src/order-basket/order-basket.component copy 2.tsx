import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  ComboBox,
  FormLabel,
  InlineLoading,
  InlineNotification,
  Search,
  Stack,
  Tile,
  SkeletonText,
  ButtonSkeleton,
} from '@carbon/react';
import { ShoppingCartArrowUp } from '@carbon/react/icons';
import useSWR, { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';
import {
  ExtensionSlot,
  getPatientName,
  PatientBannerPatientInfo,
  PatientPhoto,
  LocationPicker,
  useConfig,
  useLayoutType,
  useSession,
  type Visit,
  Workspace2,
  type Workspace2DefinitionProps,
  useDebounce,
  openmrsFetch,
  restBaseUrl,
  ResponsiveWrapper,
  ArrowRightIcon,
  ShoppingCartArrowDownIcon,
} from '@openmrs/esm-framework';
import {
  invalidateVisitAndEncounterData,
  type Order,
  type OrderBasketExtensionProps,
  type OrderBasketItem,
  postOrders,
  postOrdersOnNewEncounter,
  showOrderSuccessToast,
  useMutatePatientOrders,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import { type ConfigObject } from '@openmrs/esm-framework';
import {
  type ImagingOrderBasketItem,
  type MedicalSupplyOrderBasketItem,
  type ProcedureOrderBasketItem,
  type TestType,
} from '../types/order';
import { type Provider, useOrderEncounterForSystemWithVisitDisabled, useProviders } from '../api/api';
import GeneralOrderPanel from './general-order-type/general-order-panel.component';
import { createEmptyOrder, prepOrderPostData } from './general-order-type/resources';
import { prepImagingOrderPostData } from './imaging-resources';
import { prepProceduresOrderPostData } from './procedure-resources';
import { prepMedicalSupplyOrderPostData } from './medical-supply-resources';
import { prepTestOrderPostData } from '@openmrs/esm-patient-tests-app/src/test-orders/api';
import styles from './order-basket.scss';
import searchStyles from './general-order-type/add-general-order/search-results.scss';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { priorityOptions, type OrderUrgency, type TestOrderBasketItem } from '@openmrs/esm-patient-common-lib';




interface OrderBasketProps {
  patientUuid: string;
  patient: fhir.Patient;
  visitContext: Visit;
  mutateVisitContext: () => void;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  orderBasketExtensionProps: OrderBasketExtensionProps;
  showPatientBanner?: boolean;
  onOrderBasketSubmitted?: (encounterUuid: string, postedOrders: Array<Order>) => void;
}


function openmrsFetchMultipleConcepts(urls: Array<string>) {
  return Promise.all(urls.map((url) => openmrsFetch<any>(url)));
}

/**
 * Unified search hook that queries pre-configured concept sets for orderable concepts,
 * and /drug for medications. Only returns results when a search term is specified.
 */
const useUnifiedSearch = (
  searchTerm: string,
  labUuid: string,
  radiologyUuid: string,
  procedureUuid: string,
  medicalSupplyUuid: string
) => {
  const conceptSets = useMemo(() => [
    { category: 'Test', uuid: labUuid },
    { category: 'Radiology/Imaging Procedure', uuid: radiologyUuid },
    { category: 'Procedure', uuid: procedureUuid },
    { category: 'Medical supply', uuid: medicalSupplyUuid }
  ].filter(s => s.uuid), [labUuid, radiologyUuid, procedureUuid, medicalSupplyUuid]);

  const { data: conceptsData, error: conceptsError, isLoading: isConceptsLoading } = useSWRImmutable<any[]>(
    conceptSets.length > 0
      ? conceptSets.map(
        (c) =>
          `${restBaseUrl}/concept/${c.uuid}?v=custom:(display,names:(display),uuid,setMembers:(display,uuid,conceptClass:(display),names:(display),setMembers:(display,uuid,conceptClass:(display),names:(display))))`
      )
      : null,
    openmrsFetchMultipleConcepts,
  );

  const {
    data: drugData,
    error: drugError,
    isLoading: isSearchingDrugs,
  } = useSWR<any>(
    searchTerm
      ? `${restBaseUrl}/drug?q=${searchTerm}&v=custom:(uuid,display,name,strength,dosageForm:(display,uuid),concept:(display,uuid))`
      : null,
    openmrsFetch,
  );

  const results = useMemo(() => {
    if (!searchTerm) {
      return [];
    }

    const concepts = [];
    if (conceptsData) {
      conceptsData.forEach((response, index) => {
        const category = conceptSets[index].category;
        // The response is { data: {...} } from openmrsFetch
        const members = response?.data?.setMembers || [];
        members.forEach(m => {
          concepts.push({
            ...m,
            type: 'concept',
            conceptClass: m.conceptClass || { display: category }
          });
          if (m.setMembers) {
            m.setMembers.forEach(child => {
              concepts.push({
                ...child,
                type: 'concept',
                conceptClass: child.conceptClass || { display: category }
              })
            })
          }
        });
      });
    }

    // Filter concepts by search term
    const lowerSearch = searchTerm.toLowerCase();
    const filteredConcepts = concepts.filter(c =>
      c.display?.toLowerCase().includes(lowerSearch) ||
      c.names?.some(n => n.display?.toLowerCase().includes(lowerSearch))
    );

    const drugs = drugData?.data?.results?.map((d: any) => ({ ...d, type: 'drug' })) || [];
    return [...filteredConcepts, ...drugs];
  }, [searchTerm, conceptsData, conceptSets, drugData]);

  return {
    results,
    isLoading: isConceptsLoading || (!!searchTerm && isSearchingDrugs),
    error: conceptsError || drugError,
  };
};



const createDrugOrder = (drugItem: any, visit: Visit) => {
  const sanitizedDrug = {
    ...drugItem,
    dosageForm: drugItem.dosageForm || null,
    strength: drugItem.strength || null,
    concept: drugItem.concept || drugItem,
  };

  return {
    action: 'NEW',
    display: sanitizedDrug.display,
    drug: sanitizedDrug,
    concept: sanitizedDrug.concept,
    commonMedicationName: drugItem.name || drugItem.display,
    dosage: null,
    frequency: null,
    route: null,
    unit: sanitizedDrug.dosageForm
      ? {
        value: drugItem.dosageForm?.display,
        valueCoded: drugItem.dosageForm?.uuid,
      }
      : null,
    quantityUnits: sanitizedDrug.dosageForm
      ? {
        value: drugItem.dosageForm?.display,
        valueCoded: drugItem.dosageForm?.uuid,
      }
      : null,
    asNeeded: false,
    asNeededCondition: '',
    isFreeTextDosage: false,
    freeTextDosage: '',
    patientInstructions: '',
    startDate: new Date(),
    duration: null,
    durationUnit: null,
    pillsDispensed: null,
    numRefills: null,
    indication: '',
    visit,
  };
};


interface SearchResultItemProps {
  item: any;
  patient: fhir.Patient;
  visit: Visit;
  defaultOrderTypeUuid: string;
  orderTypes: any[];
  orderBasketExtensionProps: OrderBasketExtensionProps;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  onOrderAdded: () => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = React.memo(({
  item,
  patient,
  visit,
  defaultOrderTypeUuid,
  orderTypes,
  orderBasketExtensionProps,
  closeWorkspace,
  onOrderAdded,
}) => {
  const { t } = useTranslation();
  const config = useConfig() as ConfigObject;
  const session = useSession();

  const labOrderTypeUuid = '52a447d3-a64a-11e3-9aeb-50e549534c5e';
  const imagingOrderTypeUuid = 'c19c8e82-8b8d-4b4e-b1ff-3f09890b2db3';
  const procedureOrderTypeUuid = '4237a01f-29c5-4167-9d8e-96d6e590aa33';
  const medicalSupplyOrderTypeUuid = 'dab3ab30-2feb-48ec-b4af-8332a0831b49';

  const isDrugItem = item.type === 'drug' || item.conceptClass?.display === 'Drug';
  const isLabItem = item.conceptClass?.display === 'Test' || item.conceptClass?.display === 'LabSet';
  const isImagingItem = item.conceptClass?.display === 'Radiology/Imaging Procedure';
  const isProcedureItem = item.conceptClass?.display === 'Procedure';
  const isMedicalSupplyItem = item.conceptClass?.display === 'Medical supply' || item.conceptClass?.display === 'MedSet';

  // Compute the single basket key and prep function for this item
  const { basketKey, prepFn } = useMemo(() => {
    if (isDrugItem) return { basketKey: 'medications', prepFn: prepOrderPostData };
    if (isLabItem) return { basketKey: labOrderTypeUuid, prepFn: prepTestOrderPostData };
    if (isImagingItem) return { basketKey: imagingOrderTypeUuid, prepFn: prepImagingOrderPostData as any };
    if (isProcedureItem) return { basketKey: procedureOrderTypeUuid, prepFn: prepProceduresOrderPostData as any };
    if (isMedicalSupplyItem) return {
      basketKey: medicalSupplyOrderTypeUuid,
      prepFn: ((order, patientUuid, encounterUuid, orderingProviderUuid) =>
        prepMedicalSupplyOrderPostData(
          order as MedicalSupplyOrderBasketItem, patientUuid, encounterUuid, orderingProviderUuid,
          medicalSupplyOrderTypeUuid, config.careSettingUuid,
        )) as any,
    };
    return { basketKey: defaultOrderTypeUuid, prepFn: prepTestOrderPostData };
  }, [isDrugItem, isLabItem, isImagingItem, isProcedureItem, isMedicalSupplyItem, defaultOrderTypeUuid, config.careSettingUuid]);

  // SINGLE useOrderBasket call — subscribes only to the relevant basket
  const { orders, setOrders } = useOrderBasket<any>(patient, basketKey, prepFn);

  const itemAlreadyInBasket = useMemo(
    () => orders?.some((order) => {
      if (isDrugItem) return (order as any).drug?.uuid === item.uuid;
      return order.concept?.uuid === item.uuid;
    }),
    [orders, item.uuid, isDrugItem],
  );

  const createOrderItem = useCallback(() => {
    if (isDrugItem) {
      return { ...createDrugOrder(item, visit), isOrderIncomplete: true };
    }
    const testType = { label: item.display, conceptUuid: item.uuid, synonyms: item.names };
    const base = {
      action: 'NEW' as const,
      urgency: priorityOptions[0].value as OrderUrgency,
      display: testType.label,
      testType,
      visit,
      orderer: session.currentProvider?.uuid,
      concept: { uuid: item.uuid, display: item.display },
      isOrderIncomplete: isLabItem ? false : true,
    };
    return base;
  }, [item, visit, isDrugItem, isLabItem, session.currentProvider?.uuid]);

  const addToBasket = useCallback(() => {
    const orderItem = createOrderItem();
    setOrders([...orders, orderItem]);
    onOrderAdded();
  }, [orders, setOrders, createOrderItem, onOrderAdded]);

  const removeFromBasket = useCallback(() => {
    if (isDrugItem) {
      setOrders(orders.filter((order) => (order as any).drug?.uuid !== item.uuid));
    } else {
      setOrders(orders.filter((order) => order.concept?.uuid !== item.uuid));
    }
  }, [isDrugItem, setOrders, orders, item.uuid]);

  const openForm = useCallback(() => {
    if (isDrugItem) {
      orderBasketExtensionProps.launchDrugOrderForm(createDrugOrder(item, visit) as any);
    } else if (isLabItem) {
      const labOrder = createEmptyOrder(item, visit);
      orderBasketExtensionProps.launchLabOrderForm(labOrderTypeUuid, {
        ...labOrder, testType: { label: item.display, conceptUuid: item.uuid },
      } as any);
    } else if (isImagingItem) {
      const order = createEmptyOrder(item, visit);
      orderBasketExtensionProps.launchImagingOrderForm(imagingOrderTypeUuid, {
        ...order, testType: { label: item.display, conceptUuid: item.uuid },
      } as any);
    } else if (isProcedureItem) {
      const order = createEmptyOrder(item, visit);
      orderBasketExtensionProps.launchProcedureOrderForm(procedureOrderTypeUuid, {
        ...order, testType: { label: item.display, conceptUuid: item.uuid },
      } as any);
    } else if (isMedicalSupplyItem) {
      const order = createEmptyOrder(item, visit);
      orderBasketExtensionProps.launchMedicalSupplyForm(medicalSupplyOrderTypeUuid, {
        ...order, testType: { label: item.display, conceptUuid: item.uuid },
      } as any);
    } else {
      orderBasketExtensionProps.launchGeneralOrderForm(basketKey, createEmptyOrder(item, visit));
    }
  }, [item, visit, isDrugItem, isLabItem, isImagingItem, isProcedureItem, isMedicalSupplyItem, basketKey, orderBasketExtensionProps]);

  return (
    <Tile className={classNames(searchStyles.searchResultTile)} role="listitem">
      <div className={classNames(searchStyles.searchResultTileContent, searchStyles.text02)}>
        <p>
          <span className={searchStyles.heading}>{item.display}</span>{' '}
          {item.type === 'drug' && item.strength && <span>{`(${item.strength})`}</span>}
        </p>
        <p>{item.type === 'drug' ? t('drug', 'Drug') : item.conceptClass?.display}</p>
      </div>
      <div className={searchStyles.searchResultActions}>
        {itemAlreadyInBasket ? (
          <Button
            kind="danger--ghost"
            renderIcon={(props) => <ShoppingCartArrowUp size={16} {...props} />}
            onClick={removeFromBasket}
          >
            Remove
          </Button>
        ) : (
          <Button
            kind="ghost"
            renderIcon={(props: any) => <ShoppingCartArrowDownIcon size={16} {...props} />}
            onClick={addToBasket}
          >
            Add
          </Button>
        )}
        <Button
          kind="ghost"
          renderIcon={(props: any) => <ArrowRightIcon size={16} {...props} />}
          onClick={openForm}
        >
          {t('goToDrugOrderForm', 'Order form')}
        </Button>
      </div>
    </Tile>
  );
});

const OrderBasket: React.FC<OrderBasketProps> = ({
  patientUuid,
  patient,
  visitContext,
  mutateVisitContext,
  closeWorkspace,
  orderBasketExtensionProps,
  showPatientBanner,
  onOrderBasketSubmitted,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const config = useConfig<ConfigObject>();
  const { orderTypes, orderEncounterType, ordererProviderRoles, orderLocationTagName } = config;
  const {
    currentProvider: _currentProvider,
    sessionLocation,
    user: { person },
  } = useSession();
  const currentProvider: Provider = useMemo(() => ({ ..._currentProvider, person }), [_currentProvider, person]);
  const { orders, clearOrders } = useOrderBasket(patient);
  const [ordersWithErrors, setOrdersWithErrors] = useState<OrderBasketItem[]>([]);
  const {
    visitRequired,
    isLoading: isLoadingEncounterUuid,
    encounterUuid: orderEncounterUuid,
    error: errorFetchingEncounterUuid,
    mutate: mutateEncounterUuid,
  } = useOrderEncounterForSystemWithVisitDisabled(patientUuid);
  const [isSavingOrders, setIsSavingOrders] = useState(false);
  const [creatingEncounterError, setCreatingEncounterError] = useState('');
  const { mutate: mutateOrders } = useMutatePatientOrders(patientUuid);
  const { mutate } = useSWRConfig();

  const [orderLocationUuid, setOrderLocationUuid] = useState(sessionLocation.uuid);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const allowSelectingOrderer = ordererProviderRoles?.length > 0;
  const {
    providers,
    isLoading: isLoadingProviders,
    error: errorLoadingProviders,
  } = useProviders(allowSelectingOrderer ? ordererProviderRoles : null);

  // If configured to allow selecting providers, we wait till we fetched the allowable providers
  // before setting the orderer. If not configured, we assume the current user is the orderer.
  const [orderer, setOrderer] = useState<Provider>(allowSelectingOrderer ? null : currentProvider);

  useEffect(() => {
    if (allowSelectingOrderer && providers?.length > 0) {
      // default orderer to current user if they have the right provider roles
      if (providers.some((p) => p.uuid === currentProvider.uuid)) {
        setOrderer(currentProvider);
      }
    }
  }, [allowSelectingOrderer, providers, currentProvider]);




  const handleSave = useCallback(async () => {
    const abortController = new AbortController();
    setCreatingEncounterError('');

    setIsSavingOrders(true);
    // orderEncounterUuid should only be preset if the system does not support visits, and the user has an order encounter today.
    // If orderEncounterUuid is not present, then create an encounter along with the orders.
    // If orderEncounterUuid is present, then just post the orders to that encounter.
    if (!orderEncounterUuid) {
      try {
        const postedEncounter = await postOrdersOnNewEncounter(
          patientUuid,
          orderEncounterType,
          visitContext,
          orderLocationUuid,
          orderer.uuid,
          abortController,
        );
        await closeWorkspace({ discardUnsavedChanges: true });
        mutateEncounterUuid();
        // Only revalidate current visit since orders create new encounters
        mutateVisitContext?.();
        invalidateVisitAndEncounterData(mutate, patientUuid);
        clearOrders();
        await mutateOrders();
        onOrderBasketSubmitted?.(postedEncounter.uuid, postedEncounter.orders);

        showOrderSuccessToast('@openmrs/esm-patient-orders-app', orders);
      } catch (e) {
        console.error(e);
        setCreatingEncounterError(
          e.responseBody?.error?.message ||
          t('tryReopeningTheWorkspaceAgain', 'Please try launching the workspace again'),
        );
      }
    } else {
      try {
        const { postedOrders, erroredItems } = await postOrders(
          patientUuid,
          orderEncounterUuid,
          abortController,
          orderer.uuid,
        );
        clearOrders({ exceptThoseMatching: (item) => erroredItems.map((e) => e.display).includes(item.display) });
        await mutateOrders();
        invalidateVisitAndEncounterData(mutate, patientUuid);

        if (erroredItems.length == 0) {
          await closeWorkspace({ discardUnsavedChanges: true });
          showOrderSuccessToast('@openmrs/esm-patient-orders-app', orders);
        } else {
          setOrdersWithErrors(erroredItems);
        }
        clearOrders({ exceptThoseMatching: (item) => erroredItems.map((e) => e.display).includes(item.display) });
        mutateVisitContext?.();
        await mutateOrders();
        invalidateVisitAndEncounterData(mutate, patientUuid);
        onOrderBasketSubmitted?.(orderEncounterUuid, postedOrders);
      } catch (e) {
        console.error(e);
        setCreatingEncounterError(
          e.responseBody?.error?.message ||
          t('tryReopeningTheWorkspaceAgain', 'Please try launching the workspace again'),
        );
      }
    }
    setIsSavingOrders(false);
    return () => abortController.abort();
  }, [
    visitContext,
    clearOrders,
    closeWorkspace,
    orderEncounterType,
    orderEncounterUuid,
    mutateEncounterUuid,
    mutateOrders,
    mutateVisitContext,
    orders,
    patientUuid,
    t,
    mutate,
    orderer,
    orderLocationUuid,
    onOrderBasketSubmitted,
  ]);

  const handleCancel = useCallback(() => {
    closeWorkspace().then((didClose) => {
      if (didClose) {
        clearOrders();
      }
    });
  }, [clearOrders, closeWorkspace]);

  const patientName = getPatientName(patient);
  const filterItemsByProviderName = useCallback((menu) => {
    return menu?.item?.person?.display?.toLowerCase().includes(menu?.inputValue?.toLowerCase());
  }, []);

  const focusAndClearSearchInput = useCallback(() => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  }, []);

  const { results, isLoading: isSearching, error: searchError } = useUnifiedSearch(
    debouncedSearchTerm,
    config.labConceptSetUuid,
    config.radiologyConceptSetUuid,
    config.procedureConceptSetUuid,
    config.medicalSupplyConceptSetUuid
  );

  return (
    <Workspace2 title={t('orderBasketWorkspaceTitle', 'Order Basket')} hasUnsavedChanges={!!orders.length}>
      <div id="order-basket" className={styles.container}>
        <ExtensionSlot name="visit-context-header-slot" state={{ patientUuid }} />
        {showPatientBanner && (
          <div className={styles.patientBannerContainer}>
            <div className={styles.patientBanner}>
              <div className={styles.patientAvatar}>
                <PatientPhoto patientUuid={patient.id} patientName={patientName} />
              </div>
              <PatientBannerPatientInfo patient={patient}></PatientBannerPatientInfo>
            </div>
          </div>
        )}
        <div className={styles.orderBasketContainer}>
          <div className={styles.providerSelectorContainer}>
            <ResponsiveWrapper>
              <Search
                autoFocus
                size="lg"
                placeholder={t('searchOrderPlaceholder', 'Search for an order')}
                labelText={t('searchOrderPlaceholder', 'Search for an order')}
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
                ref={searchInputRef}
              />
            </ResponsiveWrapper>
          </div>
          {!isLoadingProviders &&
            allowSelectingOrderer &&
            (errorLoadingProviders ? (
              <InlineNotification
                kind="warning"
                lowContrast
                className={styles.inlineNotification}
                title={t('errorLoadingClinicians', 'Error loading clinicians')}
                subtitle={t('tryReopeningTheForm', 'Please try launching the form again')}
              />
            ) : (
              <div className={styles.providerSelectorContainer}>
                <ComboBox
                  id="orderer-combobox"
                  items={providers ?? []}
                  onChange={({ selectedItem }) => {
                    setOrderer(selectedItem);
                  }}
                  initialSelectedItem={orderer}
                  shouldFilterItem={filterItemsByProviderName}
                  itemToString={(item: Provider) => item?.person.display ?? ''}
                  placeholder={t('searchFieldPlaceholder', 'Search for a Provider')}
                  titleText={t('orderer', 'Orderer')}
                />
              </div>
            ))}
          {orderLocationTagName && (
            <div className={styles.orderLocationOuterContainer}>
              <FormLabel>{t('orderLocation', 'Order location')}</FormLabel>
              <div className={styles.orderLocationContainer}>
                <LocationPicker
                  selectedLocationUuid={orderLocationUuid}
                  onChange={setOrderLocationUuid}
                  locationTag={orderLocationTagName}
                />
              </div>
            </div>
          )}
          {searchTerm ? (
            <div className={searchStyles.container}>
              <div className={searchStyles.orderBasketSearchResultsHeader}>
                <span className={searchStyles.searchResultsCount}>
                  {isSearching
                    ? t('searching', 'Searching...')
                    : t('searchResultsMatchesForTerm', '{{count}} results for "{{searchTerm}}"', {
                      count: results?.length,
                      searchTerm,
                    })}
                </span>
                <Button kind="ghost" onClick={() => setSearchTerm('')} size={isTablet ? 'md' : 'sm'}>
                  {t('back', 'Back')}
                </Button>
              </div>
              {searchError && (
                <Tile className={searchStyles.emptyState}>
                  <h4 className={searchStyles.heading}>{searchError.message}</h4>
                </Tile>
              )}
              <div className={searchStyles.resultsContainer}>
                {isSearching ? (
                  <div className={searchStyles.searchResultSkeletonWrapper}>
                    <div className={searchStyles.skeletonGrid}>
                      {[...Array(6)].map((_, index) => (
                        <Tile key={index} className={searchStyles.skeletonTile}>
                          <SkeletonText />
                        </Tile>
                      ))}
                    </div>
                  </div>
                ) : (
                  results.map((item) => (
                    <SearchResultItem
                      key={item.uuid}
                      item={item}
                      patient={patient}
                      visit={visitContext}
                      defaultOrderTypeUuid={orderTypes?.[0]?.orderTypeUuid}
                      orderTypes={orderTypes}
                      orderBasketExtensionProps={orderBasketExtensionProps}
                      closeWorkspace={closeWorkspace}
                      onOrderAdded={() => { }}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <ExtensionSlot
              className={classNames(styles.orderBasketSlot, {
                [styles.orderBasketSlotTablet]: isTablet,
              })}
              name="order-basket-slot"
              state={orderBasketExtensionProps as any}
            />
          )}
          {orderTypes?.length > 0 &&
            orderTypes.map((orderType) => {
              const isImaging = orderType.orderTypeUuid === 'c19c8e82-8b8d-4b4e-b1ff-3f09890b2db3';
              const isProcedure = orderType.orderTypeUuid === '4237a01f-29c5-4167-9d8e-96d6e590aa33';
              const isMedicalSupply = orderType.orderTypeUuid === 'dab3ab30-2feb-48ec-b4af-8332a0831b49';

              let prepFunction = prepTestOrderPostData;
              if (isImaging) {
                prepFunction = prepImagingOrderPostData;
              } else if (isProcedure) {
                prepFunction = (order, patientUuid, encounterUuid, orderingProviderUuid) =>
                  prepProceduresOrderPostData(
                    order as ProcedureOrderBasketItem,
                    patientUuid,
                    encounterUuid,
                    orderingProviderUuid,
                  );
              } else if (isMedicalSupply) {
                prepFunction = (order, patientUuid, encounterUuid, orderingProviderUuid) =>
                  prepMedicalSupplyOrderPostData(
                    order as MedicalSupplyOrderBasketItem,
                    patientUuid,
                    encounterUuid,
                    orderingProviderUuid,
                    orderType.orderTypeUuid,
                    config.careSettingUuid,
                  );
              }

              return (
                <div className={styles.orderPanel} key={orderType.orderTypeUuid}>
                  <GeneralOrderPanel
                    {...orderType}
                    launchGeneralOrderForm={orderBasketExtensionProps.launchGeneralOrderForm}
                    patient={patient}
                    prepFunction={prepFunction}
                  />
                </div>
              );
            })}
        </div>
        <div>
          {(creatingEncounterError || errorFetchingEncounterUuid) && (
            <InlineNotification
              kind="error"
              title={t('tryReopeningTheWorkspaceAgain', 'Please try launching the workspace again')}
              subtitle={creatingEncounterError}
              lowContrast={true}
              className={styles.inlineNotification}
            />
          )}
          {ordersWithErrors.map((order) => (
            <InlineNotification
              lowContrast
              kind="error"
              title={t('saveDrugOrderFailed', 'Error ordering {{orderName}}', { orderName: order.display })}
              subtitle={order.extractedOrderError?.fieldErrors?.join(', ')}
              className={styles.inlineNotification}
            />
          ))}
          <ButtonSet className={styles.buttonSet}>
            <Button className={styles.actionButton} kind="secondary" onClick={handleCancel}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              className={styles.actionButton}
              kind="primary"
              onClick={handleSave}
              disabled={
                isSavingOrders ||
                !orders?.length ||
                isLoadingEncounterUuid ||
                (visitRequired && !visitContext) ||
                !orderer ||
                !orderLocationUuid
              }
            >
              {isSavingOrders ? (
                <InlineLoading description={t('saving', 'Saving') + '...'} />
              ) : (
                <span>{t('signAndClose', 'Sign and close')}</span>
              )}
            </Button>
          </ButtonSet>
        </div>
      </div>
    </Workspace2>
  );
};

export default OrderBasket;
