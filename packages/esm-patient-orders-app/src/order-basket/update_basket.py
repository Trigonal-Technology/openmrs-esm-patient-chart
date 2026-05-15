import re

file_path = 'd:/test-orders/openmrs-esm-patient-chart/packages/esm-patient-orders-app/src/order-basket/order-basket.component.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the entire SearchResultItem component
search_result_section_regex = re.compile(r'interface SearchResultItemProps \{.*?\nconst OrderBasket', re.DOTALL)
search_result_match = search_result_section_regex.search(content)

if not search_result_match:
    print('Could not find SearchResultItem section')
    exit(1)

pure_search_result_item = '''interface SearchResultItemProps {
  item: any;
  isItemInBasket: boolean;
  onToggleBasket: (item: any) => void;
  onOpenForm: (item: any) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = React.memo(({
  item,
  isItemInBasket,
  onToggleBasket,
  onOpenForm,
}) => {
  const { t } = useTranslation();

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
        {isItemInBasket ? (
          <Button
            kind="danger--ghost"
            renderIcon={(props) => <ShoppingCartArrowUp size={16} {...props} />}
            onClick={() => onToggleBasket(item)}
          >
            Remove
          </Button>
        ) : (
          <Button
            kind="ghost"
            renderIcon={(props: any) => <ShoppingCartArrowDownIcon size={16} {...props} />}
            onClick={() => onToggleBasket(item)}
          >
            Add
          </Button>
        )}
        <Button
          kind="ghost"
          renderIcon={(props: any) => <ArrowRightIcon size={16} {...props} />}
          onClick={() => onOpenForm(item)}
        >
          {t('goToDrugOrderForm', 'Order form')}
        </Button>
      </div>
    </Tile>
  );
});

const OrderBasket'''

content = content.replace(search_result_match.group(0), pure_search_result_item)

# 2. Insert the 6 useOrderBaskets and onToggleBasket into OrderBasket right after React.useState hooks
# Find where orderLocationUuid is defined in OrderBasket

basket_hooks = '''
  const labOrderTypeUuid = '52a447d3-a64a-11e3-9aeb-50e549534c5e';
  const imagingOrderTypeUuid = 'c19c8e82-8b8d-4b4e-b1ff-3f09890b2db3';
  const procedureOrderTypeUuid = '4237a01f-29c5-4167-9d8e-96d6e590aa33';
  const medicalSupplyOrderTypeUuid = 'dab3ab30-2feb-48ec-b4af-8332a0831b49';

  const session = useSession();

  const { orders: labOrders, setOrders: setLabOrders } = useOrderBasket<OrderBasketItem>(
    patient, labOrderTypeUuid, prepTestOrderPostData
  );

  const { orders: imagingOrders, setOrders: setImagingOrders } = useOrderBasket<ImagingOrderBasketItem>(
    patient, imagingOrderTypeUuid, prepImagingOrderPostData
  );

  const { orders: procedureOrders, setOrders: setProcedureOrders } = useOrderBasket<ProcedureOrderBasketItem>(
    patient, procedureOrderTypeUuid,
    (order: ProcedureOrderBasketItem, patientUuid, encounterUuid, orderingProviderUuid) =>
      prepProceduresOrderPostData(order, patientUuid, encounterUuid, orderingProviderUuid)
  );

  const { orders: medicalSupplyOrders, setOrders: setMedicalSupplyOrders } = useOrderBasket<MedicalSupplyOrderBasketItem>(
    patient, medicalSupplyOrderTypeUuid,
    (order: MedicalSupplyOrderBasketItem, patientUuid, encounterUuid, orderingProviderUuid) =>
      prepMedicalSupplyOrderPostData(
        order, patientUuid, encounterUuid, orderingProviderUuid,
        medicalSupplyOrderTypeUuid, config.careSettingUuid
      )
  );

  const { orders: generalOrders, setOrders: setGeneralOrders } = useOrderBasket<OrderBasketItem>(
    patient, orderTypes?.[0]?.orderTypeUuid, prepTestOrderPostData
  );

  const { orders: drugOrders, setOrders: setDrugOrders } = useOrderBasket<OrderBasketItem>(
    patient, 'medications', prepOrderPostData
  );

  // Helper refs to avoid inline dependencies forcing recreation of callbacks
  const labOrdersRef = React.useRef(labOrders); labOrdersRef.current = labOrders;
  const imgOrdersRef = React.useRef(imagingOrders); imgOrdersRef.current = imagingOrders;
  const procOrdersRef = React.useRef(procedureOrders); procOrdersRef.current = procedureOrders;
  const medSupOrdersRef = React.useRef(medicalSupplyOrders); medSupOrdersRef.current = medicalSupplyOrders;
  const genOrdersRef = React.useRef(generalOrders); genOrdersRef.current = generalOrders;
  const drugOrdersRef = React.useRef(drugOrders); drugOrdersRef.current = drugOrders;

  const onToggleBasket = React.useCallback((item: any) => {
    const isDrugItem = item.type === 'drug' || item.conceptClass?.display === 'Drug';
    const isLabItem = item.conceptClass?.display === 'Test' || item.conceptClass?.display === 'LabSet';
    const isImagingItem = item.conceptClass?.display === 'Radiology/Imaging Procedure';
    const isProcedureItem = item.conceptClass?.display === 'Procedure';
    const isMedicalSupplyItem = item.conceptClass?.display === 'Medical Supply' || item.conceptClass?.display === 'Question' || item.conceptClass?.display === 'MedSet';

    const getIsItemInBasket = (ordersArray: any[]) => ordersArray?.some((o) => (o as any).drug?.uuid === item.uuid || o.concept?.uuid === item.uuid);

    if (isDrugItem) {
      if (getIsItemInBasket(drugOrdersRef.current)) setDrugOrders(drugOrdersRef.current.filter((o) => (o as any).drug?.uuid !== item.uuid));
      else setDrugOrders([...drugOrdersRef.current, { ...createDrugOrder(item, visitContext), isOrderIncomplete: true } as any]);
    } else if (isLabItem) {
      if (getIsItemInBasket(labOrdersRef.current)) setLabOrders(labOrdersRef.current.filter((o) => o.concept?.uuid !== item.uuid));
      else {
        const testType = { label: item.display, conceptUuid: item.uuid, synonyms: item.names };
        setLabOrders([...labOrdersRef.current, { action: 'NEW', urgency: priorityOptions[0].value, display: testType.label, testType, visit: visitContext, orderer: session.currentProvider?.uuid, concept: { uuid: item.uuid, display: item.display }, isOrderIncomplete: false }]);
      }
    } else if (isImagingItem) {
      if (getIsItemInBasket(imgOrdersRef.current)) setImagingOrders(imgOrdersRef.current.filter((o) => o.concept?.uuid !== item.uuid));
      else {
        const testType = { label: item.display, conceptUuid: item.uuid, synonyms: item.names };
        setImagingOrders([...imgOrdersRef.current, { action: 'NEW', urgency: priorityOptions[0].value, display: testType.label, testType, visit: visitContext, orderer: session.currentProvider?.uuid, concept: { uuid: item.uuid, display: item.display }, isOrderIncomplete: true } as any]);
      }
    } else if (isProcedureItem) {
      if (getIsItemInBasket(procOrdersRef.current)) setProcedureOrders(procOrdersRef.current.filter((o) => o.concept?.uuid !== item.uuid));
      else {
        const testType = { label: item.display, conceptUuid: item.uuid, synonyms: item.names };
        setProcedureOrders([...procOrdersRef.current, { action: 'NEW', urgency: priorityOptions[0].value, display: testType.label, testType, visit: visitContext, orderer: session.currentProvider?.uuid, concept: { uuid: item.uuid, display: item.display }, isOrderIncomplete: true } as any]);
      }
    } else if (isMedicalSupplyItem) {
      if (getIsItemInBasket(medSupOrdersRef.current)) setMedicalSupplyOrders(medSupOrdersRef.current.filter((o) => o.concept?.uuid !== item.uuid));
      else {
        const testType = { label: item.display, conceptUuid: item.uuid, synonyms: item.names };
        setMedicalSupplyOrders([...medSupOrdersRef.current, { action: 'NEW', urgency: priorityOptions[0].value, display: testType.label, testType, visit: visitContext, orderer: session.currentProvider?.uuid, concept: { uuid: item.uuid, display: item.display }, isOrderIncomplete: true } as any]);
      }
    } else {
      if (getIsItemInBasket(genOrdersRef.current)) setGeneralOrders(genOrdersRef.current.filter((o) => o.concept?.uuid !== item.uuid));
      else setGeneralOrders([...genOrdersRef.current, { action: 'NEW', urgency: priorityOptions[0].value, display: item.display, testType: { label: item.display, conceptUuid: item.uuid, synonyms: item.names }, visit: visitContext, orderer: session.currentProvider?.uuid, concept: { uuid: item.uuid, display: item.display }, isOrderIncomplete: true } as any]);
    }
  }, [visitContext, session.currentProvider?.uuid]);

  const onOpenForm = React.useCallback((item: any) => {
    const isDrugItem = item.type === 'drug' || item.conceptClass?.display === 'Drug';
    const isLabItem = item.conceptClass?.display === 'Test' || item.conceptClass?.display === 'LabSet';
    const isImagingItem = item.conceptClass?.display === 'Radiology/Imaging Procedure';
    const isProcedureItem = item.conceptClass?.display === 'Procedure';
    const isMedicalSupplyItem = item.conceptClass?.display === 'Medical Supply' || item.conceptClass?.display === 'Question' || item.conceptClass?.display === 'MedSet';
    const testType = { label: item.display, conceptUuid: item.uuid };
    const baseOrder = { action: 'NEW', urgency: priorityOptions[0].value, display: item.display, testType, visit: visitContext, orderer: session.currentProvider?.uuid, concept: { uuid: item.uuid, display: item.display }, isOrderIncomplete: true };

    if (isDrugItem) orderBasketExtensionProps.launchDrugOrderForm(createDrugOrder(item, visitContext) as any);
    else if (isLabItem) orderBasketExtensionProps.launchLabOrderForm(labOrderTypeUuid, { ...baseOrder, isOrderIncomplete: false } as any);
    else if (isImagingItem) orderBasketExtensionProps.launchImagingOrderForm(imagingOrderTypeUuid, baseOrder as any);
    else if (isProcedureItem) orderBasketExtensionProps.launchProcedureOrderForm(procedureOrderTypeUuid, baseOrder as any);
    else if (isMedicalSupplyItem) orderBasketExtensionProps.launchMedicalSupplyForm(medicalSupplyOrderTypeUuid, baseOrder as any);
    else orderBasketExtensionProps.launchGeneralOrderForm(orderTypes?.[0]?.orderTypeUuid, baseOrder as any);
  }, [orderBasketExtensionProps, visitContext, session.currentProvider?.uuid, orderTypes]);

  const checkIsItemInBasket = React.useCallback((item: any) => {
    const isDrugItem = item.type === 'drug' || item.conceptClass?.display === 'Drug';
    const all = isDrugItem ? drugOrdersRef.current : [...labOrdersRef.current, ...imgOrdersRef.current, ...procOrdersRef.current, ...medSupOrdersRef.current, ...genOrdersRef.current];
    return all?.some((o) => (o as any).drug?.uuid === item.uuid || o.concept?.uuid === item.uuid) || false;
  }, [drugOrders, labOrders, imagingOrders, procedureOrders, medicalSupplyOrders, generalOrders]);
'''

replace_tag = 'const [orderLocationUuid, setOrderLocationUuid] = useState(sessionLocation.uuid);'
if replace_tag not in content:
    print('Could not find replace tag for inserting basket hooks')
    exit(1)

content = content.replace(replace_tag, replace_tag + '\n' + basket_hooks)

# 3. Update the map statement in OrderBasket
map_regex = re.compile(r'results\.map\(\(item\) => \(\s*<SearchResultItem.*?/>\s*\)\)', re.DOTALL)
new_map = '''results.map((item) => (
                    <SearchResultItem
                      key={item.uuid}
                      item={item}
                      isItemInBasket={checkIsItemInBasket(item)}
                      onToggleBasket={onToggleBasket}
                      onOpenForm={onOpenForm}
                    />
                  ))'''

if not map_regex.search(content):
    print('Could not find results.map')
    exit(1)

content = map_regex.sub(new_map, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
