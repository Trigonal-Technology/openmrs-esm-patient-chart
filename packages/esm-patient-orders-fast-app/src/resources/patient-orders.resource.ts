import { useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import type { Order, PatientOrderFetchResponse } from '@openmrs/esm-patient-common-lib';

const careSettingUuid = '6f0c9a92-6f24-11e3-af88-005056821db0';

const drugOrderCustomRepresentation =
  'custom:(uuid,dosingType,orderNumber,accessionNumber,' +
  'patient:ref,action,careSetting:ref,previousOrder:ref,dateActivated,scheduledDate,dateStopped,autoExpireDate,' +
  'orderType:ref,encounter:(uuid,display,visit),orderer:(uuid,display,person:(display)),orderReason,orderReasonNonCoded,orderType,urgency,instructions,' +
  'commentToFulfiller,fulfillerStatus,drug:(uuid,display,strength,dosageForm:(display,uuid),concept),dose,doseUnits:ref,' +
  'frequency:ref,asNeeded,asNeededCondition,quantity,quantityUnits:ref,numRefills,dosingInstructions,' +
  'duration,durationUnits:ref,route:ref,brandName,dispenseAsWritten,concept)';

function sortOrdersByDateActivated(orders: Order[]) {
  return orders?.sort((a, b) => new Date(b.dateActivated).getTime() - new Date(a.dateActivated).getTime());
}

export function usePatientDrugOrders(patientUuid: string, drugOrderTypeUuid: string) {
  const { mutate } = useSWRConfig();

  const ordersUrl = patientUuid
    ? `${restBaseUrl}/order?patient=${patientUuid}&careSetting=${careSettingUuid}&orderTypes=${drugOrderTypeUuid}&v=${drugOrderCustomRepresentation}&excludeDiscontinueOrders=true&excludeCanceledAndExpired=true`
    : null;

  const { data, error, isLoading, isValidating } = useSWR<FetchResponse<PatientOrderFetchResponse>, Error>(
    ordersUrl,
    openmrsFetch,
  );

  const mutateOrders = useCallback(
    () =>
      mutate(
        (key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/order?patient=${patientUuid}`),
        undefined,
        { revalidate: true },
      ),
    [mutate, patientUuid],
  );

  const orders = useMemo(() => sortOrdersByDateActivated(data?.data?.results ?? []) ?? [], [data]);

  return {
    data: orders,
    error,
    isLoading,
    isValidating,
    mutate: mutateOrders,
  };
}
