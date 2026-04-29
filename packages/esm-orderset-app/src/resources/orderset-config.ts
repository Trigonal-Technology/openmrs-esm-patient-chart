export type OrderMemberType = 'DRUG' | 'LAB' | 'RADIOLOGY' | 'PROCEDURE' | 'MEDICAL_SUPPLY';

export interface OrderItem {
  id: string;
  drugName: string; // Used as the display name for all types
  memberType: OrderMemberType;
  dose?: number;
  doseUnit?: string;
  doseUnitConceptId?: number;
  route?: string;
  routeConceptId?: number;
  frequency?: string;
  frequencyConceptId?: number;
  duration?: number;
  durationUnit?: string;
  durationUnitConceptId?: number;
  isDrug?: boolean;
  conceptUuid?: string;
  conceptId?: number;
  orderTypeId?: number;
  instructions?: string;
  quantity?: number;
  quantityUnits?: string;
  quantityUnitsConceptId?: number;
  numberOfRepeats?: number;
  drugId?: number;
  numRefills?: number;
  asNeeded?: boolean;
  asNeededCondition?: string;
}

export interface OrderSet {
  id: string;
  name: string;
  category: string;
  description: string;
  members: OrderItem[];
}

export const defaultOrderSets: OrderSet[] = [];

export const availableMembers = [];
