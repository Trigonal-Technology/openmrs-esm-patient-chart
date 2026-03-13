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
};

export interface ConfigObject {
  orderEncounterType: string;
  drugOrderTypeUUID: string;
}
