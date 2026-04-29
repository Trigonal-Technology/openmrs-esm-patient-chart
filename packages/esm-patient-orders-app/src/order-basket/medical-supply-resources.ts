import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import type { OrderPost } from '@openmrs/esm-patient-common-lib';
import useSWRImmutable from 'swr/immutable';
import { type MedicalSupplyOrderBasketItem, type TestType } from '../types/order';

export interface MedicalSupplyOrderPost extends OrderPost {
    quantity?: number;
    quantityUnits?: string;
    brandName?: string;
}

export function createPrepMedicalSupplyPostData(
    medicalSupplyOrderTypeUuid: string,
    careSettingUuid: string,
): PostDataPrepMedicalSupplyOrderFunction {
    return (order: MedicalSupplyOrderBasketItem, patientUuid: string, encounterUuid: string, orderingProviderUuid: string) => {
        return prepMedicalSupplyOrderPostData(order, patientUuid, encounterUuid, orderingProviderUuid, medicalSupplyOrderTypeUuid, careSettingUuid);
    };
}

export function prepMedicalSupplyOrderPostData(
    order: MedicalSupplyOrderBasketItem,
    patientUuid: string,
    encounterUuid: string,
    orderingProviderUuid: string,
    medicalSupplyUuid?: string,
    careSettingUuid?: string,
): MedicalSupplyOrderPost {
    let payload: any = {};
    if (order.action === 'NEW' || order.action === 'RENEW') {
        payload = {
            action: 'NEW',
            type: 'medicalsupplyorder',
            patient: patientUuid,
            careSetting: careSettingUuid || order.careSetting,
            orderType: medicalSupplyUuid,
            orderer: orderingProviderUuid || order.orderer,
            encounter: encounterUuid,
            concept: order.testType.conceptUuid,
            instructions: order.instructions,
            urgency: order.urgency,
            quantity: order.quantity,
            quantityUnits: order.quantityUnits,
            brandName: order.brandName,
        };
        return payload;
    } else if (order.action === 'REVISE') {
        payload = {
            action: 'REVISE',
            type: 'medicalsupplyorder',
            patient: patientUuid,
            careSetting: order.careSetting,
            orderer: orderingProviderUuid || order.orderer,
            encounter: encounterUuid,
            orderType: medicalSupplyUuid,
            concept: order.testType.conceptUuid,
            instructions: order.instructions,
            urgency: order.urgency,
            quantity: order.quantity,
            quantityUnits: order.quantityUnits,
            brandName: order.brandName,
            previousOrder: order.previousOrder,
        };
        return payload;
    } else if (order.action === 'DISCONTINUE') {
        payload = {
            action: 'DISCONTINUE',
            type: 'medicalsupplyorder',
            patient: patientUuid,
            careSetting: order.careSetting,
            orderType: medicalSupplyUuid,
            orderer: orderingProviderUuid || order.orderer,
            encounter: encounterUuid,
            concept: order.testType.conceptUuid,
            previousOrder: order.previousOrder,
        };
        return payload;
    } else {
        throw new Error(`Unknown order action: ${order.action}.`);
    }
}

export type PostDataPrepMedicalSupplyOrderFunction = (
    order: MedicalSupplyOrderBasketItem,
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
