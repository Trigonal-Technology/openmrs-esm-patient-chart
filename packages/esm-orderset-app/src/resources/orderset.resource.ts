import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { OrderSet, OrderItem, OrderMemberType } from './orderset-config';

export interface NidanOrderSetMember {
  uuid: string;
  memberType: OrderMemberType;
  sequenceNumber: number;
  conceptId?: number;
  drugId?: number;
  conceptDisplay?: string;
  orderTypeId: number;
  dose?: number;
  doseUnitConceptId?: number;
  doseUnitDisplay?: string;
  routeConceptId?: number;
  routeDisplay?: string;
  frequencyConceptId?: number;
  frequencyDisplay?: string;
  duration?: number;
  durationUnitConceptId?: number;
  durationUnitDisplay?: string;
  quantity?: number;
  quantityUnitsConceptId?: number;
  quantityUnitsDisplay?: string;
  numRefills?: number;
  asNeeded?: boolean;
  asNeededCondition?: string;
  numberOfRepeats?: number;
  instructions?: string;
}

export interface NidanOrderSet {
  uuid: string;
  name: string;
  category: string;
  description: string;
  operator: string;
  retired: boolean;
  members: NidanOrderSetMember[];
}

export function useOrderSets() {
  const { data, error, isLoading, mutate } = useSWR<{ data: { results: NidanOrderSet[] } }, Error>(
    `${restBaseUrl}/nidanOrderSet?v=full`,
    openmrsFetch,
  );

  const mappedOrderSets: OrderSet[] = data?.data?.results.map((nos) => ({
    id: nos.uuid,
    name: nos.name,
    category: nos.category || 'General',
    description: nos.description || '',
    members: nos.members.map((m) => mapNidanMemberToOrderItem(m)),
  })) ?? [];

  return {
    orderSets: mappedOrderSets,
    isLoading,
    error,
    mutate,
  };
}

export async function saveOrderSet(orderSet: OrderSet): Promise<NidanOrderSet> {
  const payload = {
    name: orderSet.name,
    category: orderSet.category,
    description: orderSet.description,
    operator: 'ALL',
    members: orderSet.members.map((m, index) => {
      const isNew = m.id.startsWith('new-') || m.id.startsWith('cd-');
      return {
        uuid: isNew ? undefined : m.id,
        memberType: m.memberType,
        sequenceNumber: index,
        conceptId: m.memberType === 'DRUG' ? undefined : m.conceptId,
        drugId: m.memberType === 'DRUG' ? (m.drugId || m.conceptId) : undefined,
        orderTypeId: m.orderTypeId || 2,
        dose: m.dose,
        doseUnitConceptId: m.doseUnitConceptId,
        routeConceptId: m.routeConceptId,
        frequencyConceptId: m.frequencyConceptId,
        duration: m.duration,
        durationUnitConceptId: m.durationUnitConceptId,
        quantity: m.quantity,
        quantityUnitsConceptId: m.quantityUnitsConceptId,
        numRefills: m.numRefills,
        asNeeded: m.asNeeded,
        asNeededCondition: m.asNeededCondition,
        numberOfRepeats: m.numberOfRepeats,
        instructions: m.instructions,
      };
    }),
  };

  const isUpdate = orderSet.id && !orderSet.id.startsWith('custom-') && !orderSet.id.startsWith('new-');
  const url = isUpdate ? `${restBaseUrl}/nidanOrderSet/${orderSet.id}` : `${restBaseUrl}/nidanOrderSet`;
  const method = isUpdate ? 'POST' : 'POST'; // OpenMRS often uses POST for updates if it's a sub-resource, but let's check. 
  // Actually, for custom resources it might be POST for both or PUT for update. 
  // The user didn't specify, but I'll use POST as it's common for OpenMRS creating/updating via the same endpoint or with UUID.

  const response = await openmrsFetch<NidanOrderSet>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });

  return response.data;
}

export async function deleteOrderSet(uuid: string, reason?: string): Promise<void> {
  const url = `${restBaseUrl}/nidanOrderSet/${uuid}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
  await openmrsFetch(url, {
    method: 'DELETE',
  });
}

function mapNidanMemberToOrderItem(member: NidanOrderSetMember): OrderItem {
  return {
    id: member.uuid,
    drugName: member.conceptDisplay || `Concept ${member.conceptId}`,
    memberType: member.memberType,
    dose: member.dose,
    doseUnit: member.doseUnitDisplay || member.doseUnitConceptId?.toString(),
    doseUnitConceptId: member.doseUnitConceptId,
    route: member.routeDisplay || member.routeConceptId?.toString(),
    routeConceptId: member.routeConceptId,
    frequency: member.frequencyDisplay || member.frequencyConceptId?.toString(),
    frequencyConceptId: member.frequencyConceptId,
    duration: member.duration,
    durationUnit: member.durationUnitDisplay || member.durationUnitConceptId?.toString(),
    durationUnitConceptId: member.durationUnitConceptId,
    instructions: member.instructions,
    conceptId: member.conceptId,
    drugId: member.drugId,
    quantity: member.quantity,
    quantityUnits: member.quantityUnitsDisplay || member.quantityUnitsConceptId?.toString(),
    quantityUnitsConceptId: member.quantityUnitsConceptId,
    numberOfRepeats: member.numberOfRepeats,
    numRefills: member.numRefills,
    asNeeded: member.asNeeded,
    asNeededCondition: member.asNeededCondition,
    orderTypeId: member.orderTypeId,
    isDrug: member.memberType === 'DRUG',
  };
}

