import { useMemo } from 'react';
import useSWR from 'swr';
import { fhirBaseUrl, openmrsFetch, restBaseUrl, useConfig, useSession, type Visit } from '@openmrs/esm-framework';
import type { FormEntryConfigSchema } from '../config-schema';
import { computeAgeYearsFromBirthDate, mapFhirGenderToMFUO } from '../forms/form-context-filter';
import type { FormEvaluationContext } from '../forms/form-evaluation-context';

function buildRoleNames(roles: Array<{ display?: string; name?: string }> | undefined): string[] {
  const set = new Set<string>();
  for (const role of roles ?? []) {
    if (role.display?.trim()) {
      set.add(role.display.trim().toLowerCase());
    }
    if (role.name?.trim()) {
      set.add(role.name.trim().toLowerCase());
    }
  }
  return [...set];
}

function personAttributeIndicatesTrue(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (typeof value === 'string') {
    return ['true', 'yes', '1'].includes(value.trim().toLowerCase());
  }
  if (value && typeof value === 'object' && 'display' in value) {
    const d = String((value as { display?: string }).display ?? '').toLowerCase();
    return ['true', 'yes', '1'].includes(d);
  }
  return false;
}

export function useFormEvaluationContext(
  patient: fhir.Patient,
  visitContext: Visit | null | undefined,
): FormEvaluationContext {
  const config = useConfig<FormEntryConfigSchema>();
  const session = useSession();
  const patientUuid = patient?.id;

  const sessionLocationUuid = session?.sessionLocation?.uuid;

  const locationUrl =
    sessionLocationUuid && `${restBaseUrl}/location/${sessionLocationUuid}?v=custom:(uuid,display,tags:(uuid,display))`;

  const { data: locationResponse, isLoading: locationLoading } = useSWR(locationUrl, openmrsFetch);

  const locationTagDisplays = useMemo(() => {
    const locationData = locationResponse?.data as { tags?: Array<{ display?: string }> } | undefined;
    const tags = locationData?.tags ?? [];
    return tags.map((t: { display?: string }) => (t.display ?? '').trim().toLowerCase()).filter(Boolean);
  }, [locationResponse]);

  const locationTagsLoaded = !sessionLocationUuid || !locationLoading;

  const mlcAttributeTypeUuid = config.medicoLegalPersonAttributeTypeUuid?.trim();
  const personUrl =
    patientUuid &&
    mlcAttributeTypeUuid &&
    `${restBaseUrl}/person/${patientUuid}?v=custom:(uuid,attributes:(value,attributeType:(uuid,display)))`;

  const { data: personResponse, isLoading: personLoading } = useSWR(personUrl, openmrsFetch);

  const { isMedicoLegalCase, mlcAttributeLoaded } = useMemo(() => {
    if (!mlcAttributeTypeUuid) {
      return { isMedicoLegalCase: undefined as boolean | undefined, mlcAttributeLoaded: true };
    }
    if (!patientUuid) {
      return { isMedicoLegalCase: false, mlcAttributeLoaded: true };
    }
    if (!personResponse?.data && personLoading) {
      return { isMedicoLegalCase: undefined as boolean | undefined, mlcAttributeLoaded: false };
    }
    if (!personResponse?.data) {
      return { isMedicoLegalCase: false, mlcAttributeLoaded: true };
    }
    const personData = personResponse.data as {
      attributes?: Array<{ value?: unknown; attributeType?: { uuid?: string } }>;
    };
    const attrs = personData.attributes ?? [];
    const match = attrs.find(
      (a: { attributeType?: { uuid?: string } }) => a.attributeType?.uuid === mlcAttributeTypeUuid,
    );
    return {
      isMedicoLegalCase: personAttributeIndicatesTrue(match?.value),
      mlcAttributeLoaded: true,
    };
  }, [mlcAttributeTypeUuid, patientUuid, personResponse, personLoading]);

  const conditionsUrl = patientUuid ? `${fhirBaseUrl}/Condition?patient=${patientUuid}&_count=100` : null;
  const { data: conditionBundle, isLoading: conditionsLoading } = useSWR(conditionsUrl, openmrsFetch);

  const { activeDiagnosisCodes, diagnosesLoaded } = useMemo(() => {
    if (!patientUuid) {
      return { activeDiagnosisCodes: [] as string[], diagnosesLoaded: true };
    }
    if (conditionsLoading && !conditionBundle) {
      return { activeDiagnosisCodes: [] as string[], diagnosesLoaded: false };
    }
    const bundle = conditionBundle?.data as { entry?: Array<{ resource?: Record<string, unknown> }> } | undefined;
    const entries = bundle?.entry ?? [];
    const codes: string[] = [];
    for (const e of entries) {
      const r = e.resource;
      if (!r || r.resourceType !== 'Condition') {
        continue;
      }
      const clinical = r.clinicalStatus as { coding?: Array<{ code?: string }> } | undefined;
      const statusCode = clinical?.coding?.[0]?.code?.toLowerCase();
      if (statusCode && statusCode !== 'active') {
        continue;
      }
      const codingList = (r.code as { coding?: Array<{ code?: string; display?: string }> })?.coding ?? [];
      for (const c of codingList) {
        if (c.code) {
          codes.push(String(c.code));
        }
        if (c.display) {
          codes.push(String(c.display));
        }
      }
    }
    return { activeDiagnosisCodes: codes, diagnosesLoaded: true };
  }, [patientUuid, conditionBundle, conditionsLoading]);

  return useMemo(
    () => ({
      patientGender: mapFhirGenderToMFUO(patient?.gender),
      patientAgeYears: computeAgeYearsFromBirthDate(patient?.birthDate),
      isMedicoLegalCase,
      mlcAttributeLoaded,
      activeDiagnosisCodes,
      diagnosesLoaded,
      sessionLocationUuid,
      locationTagDisplays,
      locationTagsLoaded,
      visitTypeUuid: visitContext?.visitType?.uuid,
      visitTypeName:
        visitContext?.visitType?.name ?? (visitContext?.visitType as { display?: string } | undefined)?.display,
      roleDisplayNamesLower: buildRoleNames(session?.user?.roles),
      user: session?.user,
    }),
    [
      patient?.gender,
      patient?.birthDate,
      isMedicoLegalCase,
      mlcAttributeLoaded,
      activeDiagnosisCodes,
      diagnosesLoaded,
      sessionLocationUuid,
      locationTagDisplays,
      locationTagsLoaded,
      visitContext?.visitType,
      session?.user,
    ],
  );
}
