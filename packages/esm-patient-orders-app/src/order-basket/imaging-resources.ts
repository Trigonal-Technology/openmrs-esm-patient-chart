import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import type { OrderPost } from '@openmrs/esm-patient-common-lib';
import useSWRImmutable from 'swr/immutable';
import { type ImagingOrderBasketItem, type TestType } from '../types/order';

export function useOrderReasons(conceptUuids: Array<string>) {
  const shouldFetch = conceptUuids && conceptUuids.length > 0;
  const url = shouldFetch ? getConceptReferenceUrls(conceptUuids) : null;
  const { data, error, isLoading } = useSWRImmutable<FetchResponse<ConceptResponse>, Error>(
    shouldFetch ? `${restBaseUrl}/${url[0]}` : null,
    openmrsFetch,
  );
  const ob = data?.data;
  const orderReasons = ob
    ? Object.entries(ob).map(([, value]) => ({
        uuid: value.uuid,
        display: value.display,
      }))
    : [];

  if (error) {
    showSnackbar({
      title: error.name,
      subtitle: error.message,
      kind: 'error',
    });
  }

  return { orderReasons: orderReasons, isLoading };
}

export interface ImagingOrderPost extends OrderPost {
  laterality?: string;
  bodySite?: string;
  modality?: string;
}

export function createPrepImagingOrderPostData(
  radiologyOrderTypeUuid: string,
  careSettingUuid: string,
): PostDataPrepImagingOrderFunction {
  return (order: ImagingOrderBasketItem, patientUuid: string, encounterUuid: string, orderingProviderUuid: string) => {
    return prepImagingOrderPostData(
      order,
      patientUuid,
      encounterUuid,
      orderingProviderUuid,
      radiologyOrderTypeUuid,
      careSettingUuid,
    );
  };
}

export function prepImagingOrderPostData(
  order: ImagingOrderBasketItem,
  patientUuid: string,
  encounterUuid: string,
  orderingProviderUuid: string,
  radiologyOrderTypeUuid?: string,
  careSettingUuid?: string,
): ImagingOrderPost {
  let payload: any = {};
  if (order.action === 'NEW' || order.action === 'RENEW') {
    payload = {
      action: 'NEW',
      type: 'radiologyOrder',
      patient: patientUuid,
      careSetting: careSettingUuid || order.careSetting,
      orderer: orderingProviderUuid || order.orderer,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      instructions: order.instructions,
      orderType: radiologyOrderTypeUuid,
      // orderReason: order.orderReason,
      // commentToFulfiller: order.commentToFulfiller,
      laterality: order.laterality,
      bodySite: order.bodySite,
      // modality: order.modality,
      urgency: order.urgency,
    };
    if (order.urgency === 'ON_SCHEDULED_DATE') {
      payload['scheduledDate'] =
        order.scheduleDate instanceof Date ? order.scheduleDate.toISOString() : order.scheduleDate;
    }
    return payload;
  } else if (order.action === 'REVISE') {
    payload = {
      action: 'REVISE',
      type: 'radiologyOrder',
      previousOrder: order.previousOrder,
      patient: patientUuid,
      careSetting: order.careSetting,
      orderer: orderingProviderUuid || order.orderer,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      instructions: order.instructions,
      orderType: radiologyOrderTypeUuid,
      // orderReason: order.orderReason,
      // commentToFulfiller: order.commentToFulfiller,
      laterality: order.laterality,
      bodySite: order.bodySite,
      // modality: order.modality,
    };
    if (order.urgency === 'ON_SCHEDULED_DATE') {
      payload['scheduledDate'] =
        order.scheduleDate instanceof Date ? order.scheduleDate.toISOString() : order.scheduleDate;
    }
    return payload;
  } else if (order.action === 'DISCONTINUE') {
    payload = {
      action: 'DISCONTINUE',
      type: 'radiologyOrder',
      previousOrder: order.previousOrder,
      patient: patientUuid,
      careSetting: order.careSetting,
      orderer: orderingProviderUuid || order.orderer,
      encounter: encounterUuid,
      concept: order.testType.conceptUuid,
      orderType: radiologyOrderTypeUuid,
      // orderReason: order.orderReason,
      // commentToFulfiller: order.commentToFulfiller,
      laterality: order.laterality,
      bodySite: order.bodySite,
      // modality: order.modality,
    };
    if (order.urgency === 'ON_SCHEDULED_DATE') {
      payload['scheduledDate'] =
        order.scheduleDate instanceof Date ? order.scheduleDate.toISOString() : order.scheduleDate;
    }
    return payload;
  } else {
    throw new Error(`Unknown order action: ${order.action}.`);
  }
}

const chunkSize = 10;
export function getConceptReferenceUrls(conceptUuids: Array<string>) {
  const accumulator = [];
  for (let i = 0; i < conceptUuids.length; i += chunkSize) {
    accumulator.push(conceptUuids.slice(i, i + chunkSize));
  }

  return accumulator.map((partition) => `conceptreferences?references=${partition.join(',')}&v=custom:(uuid,display)`);
}

export type PostDataPrepImagingOrderFunction = (
  order: ImagingOrderBasketItem,
  patientUuid: string,
  encounterUuid: string,
  orderingProviderUuid: string,
) => OrderPost;

export interface ConceptAnswers {
  display: string;
  uuid: string;
}
export interface ConceptResponse {
  uuid: string;
  display: string;
  datatype: {
    uuid: string;
    display: string;
  };
  answers: Array<ConceptAnswers>;
  setMembers: Array<ConceptAnswers>;
}

export function useConceptById(id: string) {
  const apiUrl = `ws/rest/v1/concept/${id}`;
  const { data, error, isLoading } = useSWR<
    {
      data: any; // Using any for Concept to avoid re-defining the whole thing if not needed
    },
    Error
  >(apiUrl, openmrsFetch);
  return {
    items: data?.data || {},
    isLoading,
    isError: error,
  };
}
