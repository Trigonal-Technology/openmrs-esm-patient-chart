import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import type {
  DosingUnit,
  DurationUnit,
  MedicationFrequency,
  MedicationRoute,
  QuantityUnit,
} from '@openmrs/esm-patient-common-lib';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

export interface ConceptName {
  uuid: string;
  display: string;
}

export interface CommonConfigProps {
  id: number;
  uuid: string;
  display: string;
  concept?: {
    id: number;
    names: ConceptName[];
  };
}

export interface OrderConfig {
  drugRoutes: Array<CommonConfigProps>;
  drugDosingUnits: Array<CommonConfigProps>;
  drugDispensingUnits: Array<CommonConfigProps>;
  durationUnits: Array<CommonConfigProps>;
  orderFrequencies: Array<CommonConfigProps>;
}

export interface OrderConfigObject {
  drugRoutes: Array<MedicationRoute & { conceptId?: number }>;
  drugDosingUnits: Array<DosingUnit & { conceptId?: number }>;
  drugDispensingUnits: Array<QuantityUnit & { conceptId?: number }>;
  durationUnits: Array<DurationUnit & { conceptId?: number }>;
  orderFrequencies: Array<MedicationFrequency & { conceptId?: number }>;
}

export function useOrderConfig(): {
  isLoading: boolean;
  error: Error;
  orderConfigObject: OrderConfigObject;
} {
  const { data, error, isLoading } = useSWRImmutable<{ data: OrderConfig }, Error>(
    `${restBaseUrl}/orderentryconfig`,
    openmrsFetch,
  );

  const {
    data: frequencyData,
    error: frequencyError,
    isLoading: frequencyLoading,
  } = useSWRImmutable<{ data: OrderConfig }, Error>(
    `${restBaseUrl}/orderentryconfig?v=custom:(uuid,display,concept:(id,names:(display,uuid)))`,
    openmrsFetch,
  );

  const allUuids = useMemo(() => {
    const uuids = new Set<string>();
    data?.data?.drugRoutes?.forEach((r) => uuids.add(r.uuid));
    data?.data?.drugDosingUnits?.forEach((u) => uuids.add(u.uuid));
    data?.data?.durationUnits?.forEach((u) => uuids.add(u.uuid));
    return Array.from(uuids);
  }, [data]);

  const { data: conceptIdsData, isLoading: isIdsLoading } = useSWRImmutable<any[]>(
    allUuids.length > 0 ? allUuids.map((uuid) => `${restBaseUrl}/concept/${uuid}?v=custom:(id,uuid)`) : null,
    (urls: string[]) => Promise.all(urls.map((url) => openmrsFetch<any>(url).then((res) => res.data))),
  );

  const idMap = useMemo(() => {
    const map = new Map<string, number>();
    conceptIdsData?.forEach((c) => {
      if (c.uuid && c.id) map.set(c.uuid, c.id);
    });
    return map;
  }, [conceptIdsData]);

  const results = useMemo(
    () => ({
      orderConfigObject: {
        drugRoutes:
          data?.data?.drugRoutes?.map(({ uuid, display }) => ({
            valueCoded: uuid,
            value: display,
            conceptId: idMap.get(uuid),
          })) ?? [],
        drugDosingUnits:
          data?.data?.drugDosingUnits?.map(({ uuid, display }) => ({
            valueCoded: uuid,
            value: display,
            conceptId: idMap.get(uuid),
          })) ?? [],
        drugDispensingUnits:
          data?.data?.drugDispensingUnits?.map(({ uuid, display }) => ({
            valueCoded: uuid,
            value: display,
            conceptId: idMap.get(uuid),
          })) ?? [],
        durationUnits:
          data?.data?.durationUnits?.map(({ uuid, display }) => ({
            valueCoded: uuid,
            value: display,
            conceptId: idMap.get(uuid),
          })) ?? [],
        orderFrequencies:
          frequencyData?.data?.orderFrequencies?.map(({ uuid, display, concept }) => ({
            valueCoded: uuid,
            value: display,
            names: concept?.names?.map((name: { display: string }) => name.display) ?? [display],
            conceptId: concept?.id,
          })) ?? [],
      },
      isLoading: isLoading || frequencyLoading || isIdsLoading,
      error: error || frequencyError,
    }),
    [data, error, isLoading, frequencyData, frequencyError, frequencyLoading, isIdsLoading, idMap],
  );

  return results;
}
