import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface ResolvedDrug {
  uuid: string;
  conceptUuid: string;
}

/**
 * Resolve a drug name to UUID and concept UUID via the drug search API.
 * Returns the first match or null if not found.
 */
export async function resolveDrugByName(drugName: string): Promise<ResolvedDrug | null> {
  if (!drugName?.trim()) return null;
  try {
    const url = `${restBaseUrl}/drug?q=${encodeURIComponent(drugName.trim())}&v=custom:(uuid,concept:(uuid))`;
    const response = await openmrsFetch<{ results: Array<{ uuid: string; concept: { uuid: string } }> }>(url);
    const results = response?.data?.results ?? [];
    const first = results[0];
    if (!first) return null;
    return {
      uuid: first.uuid,
      conceptUuid: first.concept?.uuid ?? '',
    };
  } catch {
    return null;
  }
}
