import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import type { OrderPost } from '@openmrs/esm-patient-common-lib';
import useSWRImmutable from 'swr/immutable';
import { type ProcedureOrderBasketItem, type TestType } from '../types/order';

export interface ProcedureOrderPost extends OrderPost {
    scheduledDate?: string;
    commentToFulfiller?: string;
    specimenSource?: string;
    specimenType?: string;
    numberOfRepeats?: string;
}

export function createPrepProceduresOrderPostData(
    procedureOrderTypeUuid: string,
    careSettingUuid: string,
): PostDataPrepProcedureOrderFunction {
    return (order: ProcedureOrderBasketItem, patientUuid: string, encounterUuid: string, orderingProviderUuid: string) => {
        return prepProceduresOrderPostData(order, patientUuid, encounterUuid, orderingProviderUuid, procedureOrderTypeUuid, careSettingUuid);
    };
}

export function prepProceduresOrderPostData(
    order: ProcedureOrderBasketItem,
    patientUuid: string,
    encounterUuid: string,
    orderingProviderUuid: string,
    procedureOrderTypeUuid?: string,
    careSettingUuid?: string,
): ProcedureOrderPost {
    let payload: any = {};
    if (order.action === 'NEW' || order.action === 'RENEW') {
        payload = {
            action: 'NEW',
            type: 'procedureorder',
            patient: patientUuid,
            careSetting: careSettingUuid || order.careSetting,
            orderer: orderingProviderUuid || order.orderer,
            encounter: encounterUuid,
            concept: order.testType.conceptUuid,
            frequency: order.frequency,
            numberOfRepeats: order.numberOfRepeats,
            urgency: order.urgency,
            commentToFulfiller: order.commentsToFulfiller,
            orderType: procedureOrderTypeUuid,
            instructions: order.instructions,
            orderReason: order.orderReason,
            orderReasonNonCoded: order.orderReasonNonCoded,
            bodySite: order.bodySite,
            category: order.category,
        };
        if (order.urgency === 'ON_SCHEDULED_DATE') {
            payload['scheduledDate'] =
                order.scheduleDate instanceof Date ? order.scheduleDate.toISOString() : order.scheduleDate;
        }
        return payload;
    } else if (order.action === 'REVISE') {
        payload = {
            action: 'REVISE',
            type: 'procedureorder',
            patient: patientUuid,
            careSetting: order.careSetting,
            orderer: orderingProviderUuid || order.orderer,
            encounter: encounterUuid,
            concept: order.testType.conceptUuid,
            specimenSource: order.specimenSource,
            specimenType: order.specimenType,
            frequency: order.frequency,
            numberOfRepeats: order.numberOfRepeats,
            urgency: order.urgency,
            commentToFulfiller: order.commentsToFulfiller,
            instructions: order.instructions,
            orderReason: order.orderReason,
            orderReasonNonCoded: order.orderReasonNonCoded,
            previousOrder: order.previousOrder,
            category: order.category,
        };
        if (order.urgency === 'ON_SCHEDULED_DATE') {
            payload['scheduledDate'] =
                order.scheduleDate instanceof Date ? order.scheduleDate.toISOString() : order.scheduleDate;
        }
        return payload;
    } else if (order.action === 'DISCONTINUE') {
        payload = {
            action: 'DISCONTINUE',
            type: 'procedureorder',
            patient: patientUuid,
            careSetting: order.careSetting,
            orderer: orderingProviderUuid || order.orderer,
            encounter: encounterUuid,
            concept: order.testType.conceptUuid,
            specimenSource: order.specimenSource,
            specimenType: order.specimenType,
            frequency: order.frequency,
            urgency: order.urgency,
            numberOfRepeats: order.numberOfRepeats,
            commentToFulfiller: order.commentsToFulfiller,
            orderReason: order.orderReason,
            orderReasonNonCoded: order.orderReasonNonCoded,
            previousOrder: order.previousOrder,
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

export type PostDataPrepProcedureOrderFunction = (
    order: ProcedureOrderBasketItem,
    patientUuid: string,
    encounterUuid: string,
    orderingProviderUuid: string,
) => OrderPost;

const chunkSize = 10;
export function getConceptReferenceUrls(conceptUuids: Array<string>) {
    const accumulator = [];
    for (let i = 0; i < conceptUuids.length; i += chunkSize) {
        accumulator.push(conceptUuids.slice(i, i + chunkSize));
    }
    return accumulator.map((partition) => `conceptreferences?references=${partition.join(',')}&v=custom:(uuid,display)`);
}

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

export function useOrderReasons(conceptUuids: Array<string>) {
    const shouldFetch = conceptUuids && conceptUuids.length > 0;
    const url = shouldFetch ? getConceptReferenceUrls(conceptUuids) : null;
    const { data, error, isLoading } = useSWRImmutable<FetchResponse<ConceptResponse>, Error>(
        shouldFetch ? `${restBaseUrl}/${url[0]}` : null,
        openmrsFetch,
    );
    const ob = data?.data;
    const orderReasons = ob
        ? Object.entries(ob).map(([key, value]) => ({
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
    return { orderReasons, isLoading };
}

export function useConceptById(id: string) {
    const apiUrl = `ws/rest/v1/concept/${id}`;
    const { data, error, isLoading } = useSWR<{ data: any }, Error>(apiUrl, openmrsFetch);
    return {
        items: data?.data || {},
        isLoading,
        isError: error,
    };
}
