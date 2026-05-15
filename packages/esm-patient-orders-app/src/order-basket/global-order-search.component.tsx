import React, { type ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import { Button, Search, SkeletonText, Tag, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  ResponsiveWrapper,
  ShoppingCartArrowDownIcon,
  useDebounce,
  useLayoutType,
  type Visit,
} from '@openmrs/esm-framework';
import { ShoppingCartArrowUp } from '@carbon/react/icons';
import {
  type OrderBasketItem,
  type OrderableConcept,
  useOrderableConceptSets,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import { createEmptyOrder, prepOrderPostData } from './general-order-type/resources';
import styles from './global-order-search.scss';

interface GlobalOrderSearchProps {
  orderTypes: any;
  launchGeneralOrderForm: (orderTypeUuid: string, order?: OrderBasketItem) => void;
  patient: fhir.Patient;
  visit: Visit;
}

const GlobalOrderSearch: React.FC<GlobalOrderSearchProps> = ({
  orderTypes,
  launchGeneralOrderForm,
  patient,
  visit,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value ?? ''),
    [],
  );

  const focusAndClearSearchInput = useCallback(() => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  }, []);

  const hasOrderTypes = orderTypes?.length > 0;

  return (
    <div className={styles.globalSearchContainer}>
      <ResponsiveWrapper>
        <Search
          autoFocus={false}
          size="lg"
          placeholder={t('globalSearchOrders', 'Search orders across all types')}
          labelText={t('globalSearchOrders', 'Search orders across all types')}
          onChange={handleSearchTermChange}
          ref={searchInputRef}
          value={searchTerm}
        />
      </ResponsiveWrapper>
      {debouncedSearchTerm && (
        <AggregatedSearchResults
          searchTerm={debouncedSearchTerm}
          orderTypes={orderTypes}
          launchGeneralOrderForm={launchGeneralOrderForm}
          patient={patient}
          visit={visit}
          focusAndClearSearchInput={focusAndClearSearchInput}
        />
      )}
    </div>
  );
};

interface AggregatedSearchResultsProps {
  searchTerm: string;
  orderTypes: any;
  launchGeneralOrderForm: (orderTypeUuid: string, order?: OrderBasketItem) => void;
  patient: fhir.Patient;
  visit: Visit;
  focusAndClearSearchInput: () => void;
}

/**
 * Renders search results from all order types. Each order type's results
 * are fetched in a child component to keep hooks unconditional.
 */
const AggregatedSearchResults: React.FC<AggregatedSearchResultsProps> = ({
  searchTerm,
  orderTypes,
  launchGeneralOrderForm,
  patient,
  visit,
  focusAndClearSearchInput,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  return (
    <div className={styles.resultsContainer}>
      {orderTypes.map((orderType) => (
        <OrderTypeSearchResults
          key={orderType.orderTypeUuid}
          searchTerm={searchTerm}
          orderType={orderType}
          launchGeneralOrderForm={launchGeneralOrderForm}
          patient={patient}
          visit={visit}
          focusAndClearSearchInput={focusAndClearSearchInput}
        />
      ))}
    </div>
  );
};

interface OrderTypeSearchResultsProps {
  searchTerm: string;
  orderType: any;
  launchGeneralOrderForm: (orderTypeUuid: string, order?: OrderBasketItem) => void;
  patient: fhir.Patient;
  visit: Visit;
  focusAndClearSearchInput: () => void;
}

/**
 * Each instance of this component searches for concepts within a single order type.
 * This pattern ensures `useOrderableConceptSets` is called as a top-level hook.
 */
const OrderTypeSearchResults: React.FC<OrderTypeSearchResultsProps> = ({
  searchTerm,
  orderType,
  launchGeneralOrderForm,
  patient,
  visit,
  focusAndClearSearchInput,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { concepts, isLoading, error } = useOrderableConceptSets(searchTerm, orderType.orderableConceptSets);

  if (isLoading) {
    return (
      <div className={styles.skeletonWrapper}>
        {[...Array(3)].map((_, i) => (
          <Tile key={i} className={styles.skeletonTile}>
            <SkeletonText />
          </Tile>
        ))}
      </div>
    );
  }

  if (error || !concepts?.length) {
    return null;
  }

  return (
    <>
      {concepts.map((concept) => (
        <GlobalSearchResultItem
          key={`${orderType.orderTypeUuid}-${concept.uuid}`}
          concept={concept}
          orderType={orderType}
          launchGeneralOrderForm={launchGeneralOrderForm}
          patient={patient}
          visit={visit}
        />
      ))}
    </>
  );
};

interface GlobalSearchResultItemProps {
  concept: OrderableConcept;
  orderType: any;
  launchGeneralOrderForm: (orderTypeUuid: string, order?: OrderBasketItem) => void;
  patient: fhir.Patient;
  visit: Visit;
}

const GlobalSearchResultItem: React.FC<GlobalSearchResultItemProps> = ({
  concept,
  orderType,
  launchGeneralOrderForm,
  patient,
  visit,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { orders, setOrders } = useOrderBasket<OrderBasketItem>(patient, orderType.orderTypeUuid, prepOrderPostData);

  const orderAlreadyInBasket = useMemo(
    () => orders?.some((order) => order.concept.uuid === concept.uuid),
    [orders, concept],
  );

  const addToBasket = useCallback(() => {
    const orderBasketItem = createEmptyOrder(concept, visit);
    orderBasketItem.isOrderIncomplete = true;
    setOrders([...orders, orderBasketItem]);
  }, [orders, setOrders, concept, visit]);

  const removeFromBasket = useCallback(() => {
    setOrders(orders.filter((order) => order?.concept?.uuid !== concept?.uuid));
  }, [setOrders, orders, concept?.uuid]);

  const handleOpenOrderForm = useCallback(() => {
    const orderBasketItem = createEmptyOrder(concept, visit);
    launchGeneralOrderForm(orderType.orderTypeUuid, orderBasketItem);
  }, [concept, visit, launchGeneralOrderForm, orderType.orderTypeUuid]);

  return (
    <Tile className={styles.resultTile} role="listitem">
      <div className={styles.resultTileContent}>
        <span className={styles.conceptName}>{concept.display}</span>
        <Tag type="blue" size={isTablet ? 'md' : 'sm'} className={styles.orderTypeTag}>
          {orderType.label || orderType.orderTypeUuid}
        </Tag>
      </div>
      <div className={styles.resultActions}>
        {orderAlreadyInBasket ? (
          <Button
            kind="danger--ghost"
            renderIcon={(props) => <ShoppingCartArrowUp size={16} {...props} />}
            onClick={removeFromBasket}
            size={isTablet ? 'md' : 'sm'}
          >
            {t('removeFromBasket', 'Remove from basket')}
          </Button>
        ) : (
          <Button
            kind="ghost"
            renderIcon={(props: ComponentProps<typeof ShoppingCartArrowDownIcon>) => (
              <ShoppingCartArrowDownIcon size={16} {...props} />
            )}
            onClick={addToBasket}
            size={isTablet ? 'md' : 'sm'}
          >
            {t('directlyAddToBasket', 'Add to basket')}
          </Button>
        )}
        <Button
          kind="ghost"
          renderIcon={(props: ComponentProps<typeof ArrowRightIcon>) => <ArrowRightIcon size={16} {...props} />}
          onClick={handleOpenOrderForm}
          size={isTablet ? 'md' : 'sm'}
        >
          {t('goToDrugOrderForm', 'Order')}
        </Button>
      </div>
    </Tile>
  );
};

export default GlobalOrderSearch;
