import { customFormRepresentation, formEncounterUrl, formEncounterUrlPoc } from './constants';

describe('form list REST representation', () => {
  it('requests formRules so contextual visibility filters can run', () => {
    expect(customFormRepresentation).toContain('formRules');
    expect(formEncounterUrl).toContain('formRules');
    expect(formEncounterUrlPoc).toContain('formRules');
  });
});
