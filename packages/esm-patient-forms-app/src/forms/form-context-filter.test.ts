import { vi } from 'vitest';
import { userHasAccess } from '@openmrs/esm-framework';
import type { FormEntryConfigSchema } from '../config-schema';
import type { CompletedFormInfo, Form } from '../types';
import type { FormEvaluationContext } from './form-evaluation-context';
import {
  computeAgeYearsFromBirthDate,
  filterFormsByContext,
  formMatchesContext,
  matchesSensitive,
  mapFhirGenderToMFUO,
  partitionFormsByGroup,
} from './form-context-filter';
import { getVisibilityRules, normalizeFormVisibilityRule } from './form-visibility.schema';

vi.mock('@openmrs/esm-framework', () => ({
  userHasAccess: vi.fn(),
}));

const mockUserHasAccess = vi.mocked(userHasAccess);

const baseConfig: FormEntryConfigSchema = {
  htmlFormEntryForms: [],
  formSections: [],
  customFormsUrl: '',
  orderBy: 'name',
  showHtmlFormEntryForms: true,
  contextualFormFiltering: true,
  medicoLegalPersonAttributeTypeUuid: '',
  formVisibilityRuleEntries: [],
};

function formStub(overrides: Partial<Form> = {}): Form {
  return {
    uuid: 'form-uuid-1',
    name: 'Test',
    version: '1',
    published: true,
    retired: false,
    resources: [],
    ...overrides,
  };
}

function completed(form: Form): CompletedFormInfo {
  return { form, associatedEncounters: [] };
}

function ctxStub(overrides: Partial<FormEvaluationContext> = {}): FormEvaluationContext {
  return {
    mlcAttributeLoaded: true,
    activeDiagnosisCodes: [],
    diagnosesLoaded: true,
    locationTagDisplays: [],
    locationTagsLoaded: true,
    roleDisplayNamesLower: [],
    user: { privileges: [{ display: 'System Developer' }], roles: [] },
    ...overrides,
  };
}

describe('mapFhirGenderToMFUO', () => {
  it('maps FHIR gender codes', () => {
    expect(mapFhirGenderToMFUO('male')).toBe('M');
    expect(mapFhirGenderToMFUO('female')).toBe('F');
    expect(mapFhirGenderToMFUO('other')).toBe('O');
    expect(mapFhirGenderToMFUO('unknown')).toBe('U');
    expect(mapFhirGenderToMFUO(undefined)).toBeUndefined();
  });
});

describe('computeAgeYearsFromBirthDate', () => {
  it('computes integer age', () => {
    const y = new Date().getFullYear() - 20;
    expect(computeAgeYearsFromBirthDate(`${y}-01-01`)).toBe(20);
  });
});

describe('formMatchesContext', () => {
  beforeEach(() => {
    mockUserHasAccess.mockReturnValue(true);
  });

  it('is visible when there is no rule metadata or only displayTags', () => {
    const form = formStub();
    expect(formMatchesContext(form, undefined, ctxStub(), baseConfig)).toBe(true);
    expect(formMatchesContext(form, { displayTags: ['x'] }, ctxStub(), baseConfig)).toBe(true);
  });

  it('filters by gender', () => {
    const rule = { gender: 'F' as const };
    expect(formMatchesContext(formStub(), rule, ctxStub({ patientGender: 'F' }), baseConfig)).toBe(true);
    expect(formMatchesContext(formStub(), rule, ctxStub({ patientGender: 'M' }), baseConfig)).toBe(false);
  });

  it('filters by age range', () => {
    const rule = { minAge: 18, maxAge: 65 };
    expect(formMatchesContext(formStub(), rule, ctxStub({ patientAgeYears: 40 }), baseConfig)).toBe(true);
    expect(formMatchesContext(formStub(), rule, ctxStub({ patientAgeYears: 10 }), baseConfig)).toBe(false);
  });

  it('requires sensitive AND forensic privilege AND MLC', () => {
    const rule = { sensitive: true, forensicPrivilege: 'App: Access Forensic Data' };
    mockUserHasAccess.mockImplementation((priv) => priv === 'App: Access Forensic Data');

    expect(
      matchesSensitive(rule, ctxStub({ isMedicoLegalCase: true, mlcAttributeLoaded: true, user: {} as never })),
    ).toBe(true);

    mockUserHasAccess.mockReturnValue(false);
    expect(
      matchesSensitive(rule, ctxStub({ isMedicoLegalCase: true, mlcAttributeLoaded: true, user: {} as never })),
    ).toBe(false);

    mockUserHasAccess.mockReturnValue(true);
    expect(
      matchesSensitive(rule, ctxStub({ isMedicoLegalCase: false, mlcAttributeLoaded: true, user: {} as never })),
    ).toBe(false);

    expect(
      matchesSensitive(rule, ctxStub({ isMedicoLegalCase: true, mlcAttributeLoaded: false, user: {} as never })),
    ).toBe(false);
  });

  it('excludes location when excludeLocationTags matches', () => {
    const rule = { excludeLocationTags: ['OPD Clinic'] };
    expect(
      formMatchesContext(
        formStub(),
        rule,
        ctxStub({ locationTagDisplays: ['opd clinic', 'triage'], locationTagsLoaded: true }),
        baseConfig,
      ),
    ).toBe(false);
    expect(
      formMatchesContext(
        formStub(),
        rule,
        ctxStub({ locationTagDisplays: ['inpatient'], locationTagsLoaded: true }),
        baseConfig,
      ),
    ).toBe(true);
  });

  it('requires location tag when specified', () => {
    const rule = { locationTags: ['Operating Room'] };
    expect(
      formMatchesContext(
        formStub(),
        rule,
        ctxStub({ locationTagDisplays: ['operating room'], locationTagsLoaded: true }),
        baseConfig,
      ),
    ).toBe(true);
    expect(
      formMatchesContext(
        formStub(),
        rule,
        ctxStub({ locationTagDisplays: ['opd clinic'], locationTagsLoaded: true }),
        baseConfig,
      ),
    ).toBe(false);
  });
});

describe('filterFormsByContext', () => {
  beforeEach(() => {
    mockUserHasAccess.mockReturnValue(true);
  });

  it('passes all forms when contextual filtering disabled', () => {
    const forms = [completed(formStub({ uuid: 'a' })), completed(formStub({ uuid: 'b' }))];
    const cfg = { ...baseConfig, contextualFormFiltering: false };
    expect(filterFormsByContext(forms, ctxStub({ patientGender: 'M' }), cfg)).toHaveLength(2);
  });

  it('filters list by rules', () => {
    const maleForm = formStub({
      uuid: 'm',
      description: JSON.stringify({ gender: 'M' }),
    });
    const femaleForm = formStub({
      uuid: 'f',
      description: JSON.stringify({ gender: 'F' }),
    });
    const forms = [completed(maleForm), completed(femaleForm)];
    const filtered = filterFormsByContext(forms, ctxStub({ patientGender: 'M' }), baseConfig);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].form.uuid).toBe('m');
  });
});

describe('partitionFormsByGroup', () => {
  it('splits recommended vs general based on rule targeting', () => {
    const locForm = formStub({
      uuid: 'loc',
      description: JSON.stringify({ locationTags: ['ER'] }),
    });
    const plainForm = formStub({ uuid: 'plain' });
    const visible = [completed(locForm), completed(plainForm)];
    const { recommended, general } = partitionFormsByGroup(visible, baseConfig);
    expect(recommended).toHaveLength(1);
    expect(recommended[0].form.uuid).toBe('loc');
    expect(general).toHaveLength(1);
  });
});

describe('normalizeFormVisibilityRule', () => {
  it('merges legacy single keys into list fields', () => {
    const n = normalizeFormVisibilityRule({
      locationTag: 'ER',
      locationTags: ['Triage'],
      requiredPrivilege: 'Get Patients',
      requiredPrivileges: ['Get Visits'],
      providerRole: 'Nurse',
      requiredRoles: ['Doctor'],
    });
    expect(n?.locationTags).toEqual(['ER', 'Triage']);
    expect(n?.requiredPrivileges).toEqual(['Get Patients', 'Get Visits']);
    expect(n?.requiredRoles).toEqual(['Nurse', 'Doctor']);
  });

  it('drops visitTypeNames from parsed payloads', () => {
    const n = normalizeFormVisibilityRule({ visitTypeNames: ['Outpatient'], visitTypeUuids: ['a-uuid'] });
    expect(n?.visitTypeUuids).toEqual(['a-uuid']);
    expect(n).not.toHaveProperty('visitTypeNames');
  });
});

describe('getVisibilityRules', () => {
  it('reads config overlay first', () => {
    const form = formStub({ uuid: 'x' });
    const cfg: FormEntryConfigSchema = {
      ...baseConfig,
      formVisibilityRuleEntries: [{ formUuid: 'x', rulesJson: JSON.stringify({ minAge: 5 }) }],
    };
    expect(getVisibilityRules(form, cfg)?.minAge).toBe(5);
  });

  it('uses form.formRules from REST before embedded visibility resources', () => {
    const form = formStub({
      uuid: 'x',
      formRules: { minAge: 10 },
      resources: [
        {
          uuid: 'r1',
          name: 'nidan-visibility-rules',
          dataType: 'text',
          valueReference: JSON.stringify({ minAge: 99 }),
        },
      ],
    });
    expect(getVisibilityRules(form, baseConfig)?.minAge).toBe(10);
  });
});
