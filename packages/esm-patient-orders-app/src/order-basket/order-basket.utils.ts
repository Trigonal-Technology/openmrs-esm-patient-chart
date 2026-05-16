import { type Workspace2DefinitionProps , type Visit, toOmrsIsoString } from '@openmrs/esm-framework';
import { QuantityUnit } from './../../../esm-patient-common-lib/src/orders/types/order';
import {
  priorityOptions,
  type OrderUrgency,
  type OrderBasketItem,
  type OrderBasketExtensionProps,
  type OrderPost,
} from '@openmrs/esm-patient-common-lib';

/**
 * Returns the earliest startDate among basket items (drug orders), or `now`
 * when no item has a startDate set.
 */
export function getEarliestStartDate(orders: ReadonlyArray<OrderBasketItem>, now: Date = new Date()): Date {
  return orders.reduce<Date>((earliest, order) => {
    const startDateValue = (order as { startDate?: Date | string }).startDate;
    if (!startDateValue) {
      return earliest;
    }
    const startDate = startDateValue instanceof Date ? startDateValue : new Date(startDateValue);
    return startDate < earliest ? startDate : earliest;
  }, now);
}

export interface CreateOrderBasketExtensionPropsArguments {
  patient: fhir.Patient;
  drugOrderWorkspaceName?: string;
  labOrderWorkspaceName?: string;
  generalOrderWorkspaceName?: string;
  launchChildWorkspace?: Workspace2DefinitionProps['launchChildWorkspace'];
  visibleOrderPanels?: Array<string>;
}

export function createOrderBasketExtensionProps({
  patient,
  drugOrderWorkspaceName,
  labOrderWorkspaceName,
  generalOrderWorkspaceName,
  launchChildWorkspace,
  visibleOrderPanels,
}: CreateOrderBasketExtensionPropsArguments): OrderBasketExtensionProps {
  const result: OrderBasketExtensionProps = {
    patient,
    launchDrugOrderForm: () => undefined,
    launchLabOrderForm: () => undefined,
    launchGeneralOrderForm: () => undefined,
    launchImagingOrderForm: () => undefined,
    launchProcedureOrderForm: () => undefined,
    launchMedicalSupplyForm: () => undefined,
  };

  if (launchChildWorkspace) {
    if (drugOrderWorkspaceName) {
      result.launchDrugOrderForm = (order: OrderBasketItem) => {
        launchChildWorkspace(drugOrderWorkspaceName, { order });
      };
    }

    if (labOrderWorkspaceName) {
      result.launchLabOrderForm = (orderTypeUuid: string, order: OrderBasketItem) => {
        launchChildWorkspace(labOrderWorkspaceName, { orderTypeUuid, order });
      };
    }

    if (generalOrderWorkspaceName) {
      result.launchGeneralOrderForm = (orderTypeUuid: string, order: OrderBasketItem) => {
        launchChildWorkspace(generalOrderWorkspaceName, { orderTypeUuid, order });
      };
    }
  }

  return result;
}
import { type ConfigObject } from '../config-schema';
import { prepOrderPostData, createEmptyOrder } from './general-order-type/resources';
import { prepImagingOrderPostData } from './imaging-resources';
import { prepProceduresOrderPostData } from './procedure-resources';
import { prepMedicalSupplyOrderPostData } from './medical-supply-resources';
import { prepTestOrderPostData } from '@openmrs/esm-patient-tests-app/src/test-orders/api';

export const prepDrugOrderPostData = (
  order: any,
  patientUuid: string,
  encounterUuid: string,
  orderingProviderUuid: string,
  careSettingUuid: string,
): any => {
  return {
    action: 'NEW' as const,
    patient: patientUuid,
    type: 'drugorder' as const,
    careSetting: careSettingUuid,
    orderer: orderingProviderUuid,
    encounter: encounterUuid,
    drug: order.drug?.uuid,
    dose: order.dosage,
    doseUnits: order.unit?.valueCoded,
    route: order.route?.valueCoded,
    frequency: order.frequency?.valueCoded,
    duration: order.duration,
    durationUnits: order.durationUnit?.valueCoded,
    dosingType: 'org.openmrs.SimpleDosingInstructions' as const,
    dosingInstructions: order.patientInstructions,
    concept: order.drug?.concept?.uuid || order.concept?.uuid,
  } as any;
};

export const createDrugOrder = (drugItem: any, visit: Visit) => {
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

export const getOrderItemDetails = (item: any, config: ConfigObject) => {
  const {
    labOrderTypeUuid,
    radiologyOrderTypeUuid,
    procedureOrderTypeUuid,
    medicalSupplyOrderTypeUuid,
    careSettingUuid,
  } = config;

  const isDrugItem = item.type === 'drug' || item.conceptClass?.display === 'Drug';
  const isLabItem = item.conceptClass?.display === 'Test' || item.conceptClass?.display === 'LabSet';
  const isImagingItem = item.conceptClass?.display === 'Radiology/Imaging Procedure';
  const isProcedureItem = item.conceptClass?.display === 'Procedure';
  const isMedicalSupplyItem =
    item.conceptClass?.display === 'Medical supply' || item.conceptClass?.display === 'MedSet';

  if (isDrugItem) {
    return {
      basketKey: 'medications',
      prepFn: ((order, patientUuid, encounterUuid, orderingProviderUuid) =>
        prepDrugOrderPostData(order, patientUuid, encounterUuid, orderingProviderUuid, careSettingUuid)) as any,
      isDrugItem,
      isLabItem: false,
      isImagingItem: false,
      isProcedureItem: false,
      isMedicalSupplyItem: false,
    };
  }

  if (isLabItem) {
    return {
      basketKey: labOrderTypeUuid,
      prepFn: prepTestOrderPostData as any,
      isDrugItem: false,
      isLabItem,
      isImagingItem: false,
      isProcedureItem: false,
      isMedicalSupplyItem: false,
    };
  }

  if (isImagingItem) {
    return {
      basketKey: radiologyOrderTypeUuid,
      prepFn: prepImagingOrderPostData as any,
      isDrugItem: false,
      isLabItem: false,
      isImagingItem,
      isProcedureItem: false,
      isMedicalSupplyItem: false,
    };
  }

  if (isProcedureItem) {
    return {
      basketKey: procedureOrderTypeUuid,
      prepFn: ((order, patientUuid, encounterUuid, orderingProviderUuid) =>
        prepProceduresOrderPostData(order as any, patientUuid, encounterUuid, orderingProviderUuid)) as any,
      isDrugItem: false,
      isLabItem: false,
      isImagingItem: false,
      isProcedureItem,
      isMedicalSupplyItem: false,
    };
  }

  if (isMedicalSupplyItem) {
    return {
      basketKey: medicalSupplyOrderTypeUuid,
      prepFn: ((order, patientUuid, encounterUuid, orderingProviderUuid) =>
        prepMedicalSupplyOrderPostData(
          order as any,
          patientUuid,
          encounterUuid,
          orderingProviderUuid,
          medicalSupplyOrderTypeUuid,
          careSettingUuid,
        )) as any,
      isDrugItem: false,
      isLabItem: false,
      isImagingItem: false,
      isProcedureItem: false,
      isMedicalSupplyItem,
    };
  }

  return {
    basketKey: config.orderTypes?.[0]?.orderTypeUuid,
    prepFn: prepTestOrderPostData as any,
    isDrugItem: false,
    isLabItem: false,
    isImagingItem: false,
    isProcedureItem: false,
    isMedicalSupplyItem: false,
  };
};

export const constructOrderItem = (
  item: any,
  visit: Visit,
  providerUuid: string,
  details: ReturnType<typeof getOrderItemDetails>,
) => {
  if (details.isDrugItem) {
    return { ...createDrugOrder(item, visit), isOrderIncomplete: true };
  }

  const testType = { label: item.display, conceptUuid: item.uuid, synonyms: item.names };
  return {
    action: 'NEW' as const,
    urgency: priorityOptions[0].value as OrderUrgency,
    display: testType.label,
    testType,
    visit,
    orderer: providerUuid,
    concept: { uuid: item.uuid, display: item.display },
    numberOfRepeats: details.isProcedureItem ? 1 : undefined,
    // isOrderIncomplete: !details.isLabItem, // Labs are complete, others are not
  };
};
export const transformOrderSetMember = (member: any, visit: Visit, providerUuid: string, config: ConfigObject) => {
  const { memberType, instructions } = member;

  if (memberType === 'DRUG') {
    const drugOrder = {
      action: 'NEW',
      display: member.conceptDisplay,
      commonMedicationName: member.conceptDisplay,
      drug: {
        uuid: member.drugUuid,
        display: member.conceptDisplay || member.display,
        concept: {
          uuid: member.conceptUuid,
        },
      },
      dosage: member.dose,
      unit: member.doseUnitUuid ? { value: member.doseUnitDisplay, valueCoded: member.doseUnitUuid } : null,
      route: member.routeUuid ? { valueCoded: member.routeUuid, value: member.routeDisplay } : null,
      frequency: member.frequencyUuid ? { valueCoded: member.frequencyUuid, value: member.frequencyDisplay } : null,
      duration: member.duration,
      durationUnit: member.durationUnitUuid
        ? { valueCoded: member.durationUnitUuid, value: member.durationUnitDisplay }
        : null,
      patientInstructions: instructions,
      pillsDispensed: member.quantity,
      numRefills: 0,
      quantityUnits: member.quantityUnitsUuid
        ? { value: member.quantityUnitsDisplay, valueCoded: member.quantityUnitsUuid }
        : null,
      visit,
      startDate: new Date(),
    };
    return {
      basketKey: 'medications',
      prepFn: ((order, patientUuid, encounterUuid, orderingProviderUuid) =>
        prepDrugOrderPostData(order, patientUuid, encounterUuid, orderingProviderUuid, config.careSettingUuid)) as any,
      order: drugOrder,
    };
  }

  //     action: 'NEW',
  //     patient: patientUuid,
  //     type: 'drugorder',
  //     orderer: orderingProviderUuid,
  //     encounter: encounterUuid,
  //     drug: order.drug.uuid,
  //     dose: order.dosage,
  //     doseUnits: order.unit?.valueCoded,
  //     route: order.route?.valueCoded,
  //     frequency: order.frequency?.valueCoded,
  //     duration: order.duration,
  //     durationUnits: order.durationUnit?.valueCoded,
  //     dosingType: 'org.openmrs.SimpleDosingInstructions',
  //     dosingInstructions: order.patientInstructions,
  //     concept: order.drug.concept.uuid,
  const category =
    memberType === 'LAB'
      ? 'Test'
      : memberType === 'RADIOLOGY'
        ? 'Radiology/Imaging Procedure'
        : memberType === 'MEDICAL_SUPPLY'
          ? 'Medical supply'
          : 'Procedure';
  const details = getOrderItemDetails({ conceptClass: { display: category } } as any, config);
  const testType = { label: member.conceptDisplay || member.display, conceptUuid: member.conceptUuid };
  const order = {
    action: 'NEW' as const,
    urgency: priorityOptions[0].value as OrderUrgency,
    display: testType.label,
    testType,
    visit,
    orderer: providerUuid,
    concept: { uuid: member.conceptUuid, display: member.conceptDisplay || member.display },
    instructions: instructions,
    numberOfRepeats: category === 'Procedure' ? member.numberOfRepeats || 1 : member.numberOfRepeats,
    quantity: member.quantity,
    quantityUnits: member.quantityUnitsUuid,
  };

  return { basketKey: details.basketKey, prepFn: details.prepFn, order };
};
