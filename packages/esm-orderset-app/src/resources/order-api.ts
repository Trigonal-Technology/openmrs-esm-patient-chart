import { postOrder, postEncounter, type DrugOrderPost, type OrderPost } from '@openmrs/esm-patient-common-lib';

const careSettingUuid = '6f0c9a92-6f24-11e3-af88-005056821db0';

export interface FastOrderPayload {
  drugUuid: string;
  conceptUuid: string;
  dose: number;
  doseUnits: string;
  route: string;
  frequency: string;
  asNeeded: boolean;
  asNeededCondition?: string;
  quantity: number;
  quantityUnits: string;
  duration: number;
  durationUnits: string;
  dosingInstructions?: string;
  orderReasonNonCoded?: string;
}

function buildOrderPost(
  payload: FastOrderPayload,
  patientUuid: string,
  ordererUuid: string,
  encounterUuid?: string,
): DrugOrderPost {
  const order: DrugOrderPost = {
    action: 'NEW',
    patient: patientUuid,
    type: 'drugorder',
    careSetting: careSettingUuid,
    orderer: ordererUuid,
    drug: payload.drugUuid,
    dose: payload.dose,
    doseUnits: payload.doseUnits,
    route: payload.route,
    frequency: payload.frequency,
    asNeeded: payload.asNeeded,
    asNeededCondition: payload.asNeededCondition ?? null,
    numRefills: 0,
    quantity: payload.quantity,
    quantityUnits: payload.quantityUnits,
    duration: payload.duration,
    durationUnits: payload.durationUnits,
    dosingType: 'org.openmrs.SimpleDosingInstructions',
    dosingInstructions: payload.dosingInstructions ?? '',
    concept: payload.conceptUuid,
    orderReasonNonCoded: payload.orderReasonNonCoded ?? null,
  };
  if (encounterUuid) {
    order.encounter = encounterUuid;
  }
  return order;
}

export function buildDrugOrderPost(
  payload: FastOrderPayload,
  patientUuid: string,
  encounterUuid: string,
  ordererUuid: string,
): DrugOrderPost {
  return buildOrderPost(payload, patientUuid, ordererUuid, encounterUuid);
}

export async function submitDrugOrder(
  payload: FastOrderPayload,
  patientUuid: string,
  encounterUuid: string,
  ordererUuid: string,
  abortController?: AbortController,
) {
  const body = buildOrderPost(payload, patientUuid, ordererUuid, encounterUuid);
  const response = await postOrder(body, abortController);
  return response?.data;
}

export async function submitOrdersOnNewEncounter(
  payloads: FastOrderPayload[],
  patientUuid: string,
  ordererUuid: string,
  orderEncounterType: string,
  orderLocationUuid: string,
  visitUuid?: string,
  abortController?: AbortController,
) {
  const orders: OrderPost[] = payloads.map((p) => buildOrderPost(p, patientUuid, ordererUuid));
  const encounterPostData = {
    patient: patientUuid,
    location: orderLocationUuid,
    encounterType: orderEncounterType,
    visit: visitUuid,
    obs: [],
    orders,
  };
  return postEncounter(encounterPostData, abortController);
}
