import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  orderEncounterType: {
    _type: Type.UUID,
    _description: 'The encounter type for drug orders. Defaults to the "Order" encounter type.',
    _default: '39da3525-afe4-45ff-8977-c53b7b359158',
  },
  drugOrderTypeUUID: {
    _type: Type.UUID,
    _description: "UUID for the 'Drug' order type to fetch medications",
    _default: '131168f4-15f5-102d-96e4-000c29c2a5d7',
  },
  labConceptSetUuid: {
    _type: Type.UUID,
    _description: 'Concept set UUID for Lab orders.',
    _default: '300e7e12-f268-4349-81dc-d40cc7a202a0',
    // _default: '1748a953-d12e-4be1-914c-f6b096c6cdef',
  },
  radiologyConceptSetUuid: {
    _type: Type.UUID,
    _description: 'Concept set UUID for Radiology orders.',
    _default: 'd894a942-5d10-431f-b008-28436a977b4e',
    // _default: 'cd9f116c-517d-439e-847d-d8d257434083',
  },
  procedureConceptSetUuid: {
    _type: Type.UUID,
    _description: 'Concept set UUID for Procedure orders.',
    _default: '0c3019b0-9bd3-4bc7-8e2c-e6230c31ed18',
    // _default: '0c3019b0-9bd3-4bc7-8e2c-e6230c31ed18',
  },
  medicalSupplyConceptSetUuid: {
    _type: Type.UUID,
    _description: 'Concept set UUID for Medical Supply orders.',
    _default: '095befe9-ff7c-4eba-bbd8-37b055f52e7d',
  },
};

export interface ConfigObject {
  orderEncounterType: string;
  drugOrderTypeUUID: string;
  labConceptSetUuid: string;
  radiologyConceptSetUuid: string;
  procedureConceptSetUuid: string;
  medicalSupplyConceptSetUuid: string;
}
