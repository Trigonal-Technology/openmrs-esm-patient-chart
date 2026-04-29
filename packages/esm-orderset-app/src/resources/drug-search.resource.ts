import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import { type FetchResponse, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import type { ConfigObject } from '../config-schema';

function openmrsFetchMultipleConcepts(urls: Array<string>) {
  return Promise.all(urls.map((url) => openmrsFetch<any>(url)));
}

export interface DrugSearchResult {
  id: number;
  uuid: string;
  display: string;
  name: string;
  strength: string;
  dosageForm: {
    display: string;
    uuid: string;
  };
  concept: {
    id: number;
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
      ? `${restBaseUrl}/drug?q=${encodeURIComponent(query)}&v=custom:(id,uuid,display,name,strength,dosageForm:(display,uuid),concept:(id,uuid,display))`
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

export interface ConceptSearchResult {
  id: number;
  uuid: string;
  display: string;
  conceptClass?: {
    uuid: string;
    display: string;
  };
}

/**
 * Search for all concepts (Lab orders, etc.) based on the given query string.
 * It filters results to specifically orderable concepts (Tests, Procedures, etc.)
 * by searching through configured concept sets or specific concept classes.
 */
export function useConceptSearch(query: string) {
  const config = useConfig() as ConfigObject;
  
  const conceptSets = useMemo(() => [
    { category: 'Test', uuid: config.labConceptSetUuid },
    { category: 'Radiology/Imaging Procedure', uuid: config.radiologyConceptSetUuid },
    { category: 'Procedure', uuid: config.procedureConceptSetUuid },
    { category: 'Medical supply', uuid: config.medicalSupplyConceptSetUuid }
  ].filter(s => s.uuid), [
    config.labConceptSetUuid, 
    config.radiologyConceptSetUuid, 
    config.procedureConceptSetUuid, 
    config.medicalSupplyConceptSetUuid
  ]);

  // Fetch concept sets and their members
  const { data: conceptSetsData, isLoading: isSetsLoading, error: setsError } = useSWRImmutable<any[]>(
    conceptSets.length > 0
      ? conceptSets.map(
          (c) =>
            `${restBaseUrl}/concept/${c.uuid}?v=custom:(id,uuid,display,setMembers:(id,uuid,display,conceptClass:(display),names:(display),setMembers:(id,uuid,display,conceptClass:(display),names:(display))))`
        )
      : null,
    openmrsFetchMultipleConcepts
  );

  // Fallback/Supplement search by classes
  const classesToInclude = '8caa332c-efe4-4025-8b18-3398328e1323,Test,Procedure,Radiology/Imaging Procedure,Medical supply';
  const { data: generalData, isLoading: isGeneralLoading, error: generalError } = useSWRImmutable<FetchResponse<{ results: Array<ConceptSearchResult> }>, Error>(
    query && conceptSets.length === 0
      ? `${restBaseUrl}/concept?q=${encodeURIComponent(query)}&v=custom:(id,uuid,display,conceptClass:(display,uuid))&includeConceptClasses=${classesToInclude}`
      : null,
    openmrsFetch
  );

  const results = useMemo(() => {
    if (!query) return [];
    
    let allConcepts: ConceptSearchResult[] = [];

    if (conceptSetsData) {
      conceptSetsData.forEach((response, index) => {
        const category = conceptSets[index].category;
        const members = response?.data?.setMembers || [];
        members.forEach((m: any) => {
          allConcepts.push({
            id: m.id,
            uuid: m.uuid,
            display: m.display,
            conceptClass: m.conceptClass || { display: category, uuid: '' }
          });
          if (m.setMembers) {
            m.setMembers.forEach((child: any) => {
              allConcepts.push({
                id: child.id,
                uuid: child.uuid,
                display: child.display,
                conceptClass: child.conceptClass || { display: category, uuid: '' }
              });
            });
          }
        });
      });
      
      const lowerQuery = query.toLowerCase();
      allConcepts = allConcepts.filter(c => 
        c.display?.toLowerCase().includes(lowerQuery)
      );
    }

    if (generalData?.data?.results) {
      allConcepts = [...allConcepts, ...generalData.data.results];
    }

    const seen = new Set();
    return allConcepts.filter(c => {
      const duplicate = seen.has(c.uuid);
      seen.add(c.uuid);
      return !duplicate;
    });
  }, [query, conceptSetsData, conceptSets, generalData]);

  return {
    concepts: results,
    isLoading: isSetsLoading || isGeneralLoading,
    error: setsError || generalError,
  };
}
