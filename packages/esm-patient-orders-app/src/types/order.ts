import { type Order, type TestOrderBasketItem } from '@openmrs/esm-patient-common-lib';

export interface TestType {
  label: string;
  conceptUuid: string;
  synonyms: Array<string>;
}

export interface PatientMedicationFetchResponse {
  results: Array<Order>;
}

export interface OrderDiscontinuationPayload {
  previousOrder: string;
  type: string;
  action: string;
  careSetting: string;
  encounter: string;
  patient: string;
  concept: string;
  orderer: { display: string; person: { display: string }; uuid: string };
}

export interface OrderPriceData {
  resourceType: string;
  id: string;
  meta: {
    lastUpdated: string;
  };
  type: string;
  link: {
    relation: string;
    url: string;
  }[];
  entry: {
    resource: {
      resourceType: string;
      id: string;
      name: string;
      status: string;
      date: string;
      propertyGroup: {
        priceComponent: {
          type: string;
          amount: {
            value: number;
            currency: string;
          };
        }[];
      }[];
    };
  }[];
}

export interface OrderStockData {
  resourceType: string;
  id: string;
  meta: {
    lastUpdated: string;
  };
  type: string;
  link: {
    relation: string;
    url: string;
  }[];
  entry: {
    resource: {
      resourceType: string;
      id: string;
      meta: {
        profile: string[];
      };
      status: string;
      code: {
        coding: {
          system: string;
          code: string;
          display: string;
        }[];
      }[];
      name: {
        name: string;
      }[];
      netContent: {
        value: number;
        unit: string;
      };
    };
  }[];
}

export interface ImagingOrderBasketItem extends TestOrderBasketItem {
  laterality?: string;
  bodySite?: string;
  modality?: string;
  instructions?: string;
  scheduleDate?: Date | string;
  orderer?: string;
  careSetting?: string;
  previousOrder?: string;
  testType: TestType;
}

export interface ProcedureOrderBasketItem extends TestOrderBasketItem {
  testType: TestType;
  orderer?: string;
  careSetting?: string;
  frequency?: any;
  numberOfRepeats?: string;
  commentsToFulfiller?: string;
  orderReason?: any;
  orderReasonNonCoded?: string;
  bodySite?: any;
  category?: any;
  specimenSource?: string;
  specimenType?: string;
  urgency?: any;
  scheduleDate?: Date | string;
  instructions?: string;
  previousOrder?: string;
}

export interface MedicalSupplyOrderBasketItem extends TestOrderBasketItem {
  testType: TestType;
  orderer?: string;
  careSetting?: string;
  quantity?: number;
  quantityUnits?: any;
  brandName?: string;
  instructions?: string;
  urgency?: any;
  previousOrder?: string;
}
