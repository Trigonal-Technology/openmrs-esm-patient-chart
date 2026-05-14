import React from 'react';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type FormEntryConfigSchema } from '../config-schema';
import FormsDashboard from './forms-dashboard.component';
import { mockPatient } from 'tools';

const mockUseConfig = jest.mocked(useConfig<FormEntryConfigSchema>);

jest.mock('@openmrs/esm-patient-common-lib', () => ({
  EmptyDataIllustration: () => <div data-testid="empty-illustration" />,
}));

jest.mock('../hooks/use-forms', () => ({
  useForms: jest.fn().mockReturnValueOnce({
    data: [],
    error: null,
    isValidating: false,
    allForms: [],
  }),
}));

jest.mock('../hooks/use-form-evaluation-context', () => ({
  useFormEvaluationContext: jest.fn(() => ({
    mlcAttributeLoaded: true,
    activeDiagnosisCodes: [],
    diagnosesLoaded: true,
    locationTagDisplays: [],
    locationTagsLoaded: true,
    roleDisplayNamesLower: [],
    user: { privileges: [], roles: [] },
  })),
}));

mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), htmlFormEntryForms: [] });

describe('FormsDashboard', () => {
  test('renders an empty state if there are no forms persisted on the server', async () => {
    render(<FormsDashboard handleFormOpen={jest.fn()} patient={mockPatient} visitContext={null} />);

    expect(screen.getByText(/there are no forms to display/i)).toBeInTheDocument();
  });
});
