import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface DrugSearchResult {
  uuid: string;
  display: string;
  name: string;
  strength: string;
  dosageForm: {
    display: string;
    uuid: string;
  };
  concept: {
    display: string;
    uuid: string;
  };
}

/**
 * Search for drugs based on the given query string
 */
export function useDrugSearch(query: string) {
  const { data, ...rest } = useSWRImmutable<FetchResponse<{ results: Array<DrugSearchResult> }>, Error>(
    query
      ? `${restBaseUrl}/drug?q=${encodeURIComponent(query)}&v=custom:(uuid,display,name,strength,dosageForm:(display,uuid),concept:(display,uuid))`
      : null,
    openmrsFetch,
  );

  const results = useMemo(
    () => ({
      drugs: data?.data?.results ?? [],
      ...rest,
    }),
    [data, rest],
  );

  return results;
}
