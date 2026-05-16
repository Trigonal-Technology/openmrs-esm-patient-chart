import React from 'react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExtensionSlot, showSnackbar, useConnectivity } from '@openmrs/esm-framework';
import { mockPatient } from 'tools';
import { markPatientDeceased, useFormByName } from '../data.resource';
import MarkPatientDeceasedForm from './mark-patient-deceased-form.workspace';
import { type PatientWorkspace2DefinitionProps } from '@openmrs/esm-patient-common-lib/src';

const mockMarkPatientDeceased = vi.mocked(markPatientDeceased);
const mockUseFormByName = vi.mocked(useFormByName);
const mockExtensionSlot = ExtensionSlot as Mock;
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockUseConnectivity = vi.mocked(useConnectivity);
const mockCloseWorkspace = vi.fn();

const deathNoteFormUuid = 'death-note-form-uuid';

vi.mock('../data.resource', () => ({
  markPatientDeceased: vi.fn().mockResolvedValue({}),
  useFormByName: vi.fn(),
}));

vi.mock('@openmrs/esm-patient-common-lib', async () => ({
  ...((await vi.importActual('@openmrs/esm-patient-common-lib')) as object),
  invalidateCurrentVisit: vi.fn(),
  invalidateVisitAndEncounterData: vi.fn(),
}));

describe('MarkPatientDeceasedForm', () => {
  const defaultProps: PatientWorkspace2DefinitionProps<{}, {}> = {
    closeWorkspace: mockCloseWorkspace,
    workspaceName: null,
    launchChildWorkspace: vi.fn(),
    windowProps: {},
    workspaceProps: {},
    groupProps: {
      patientUuid: mockPatient.id,
      patient: mockPatient,
      visitContext: null,
      mutateVisitContext: null,
    },
    windowName: '',
    isRootWorkspace: false,
    showActionMenu: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConnectivity.mockReturnValue(true);
    mockExtensionSlot.mockImplementation(({ name }) => <span data-testid={name} />);
    mockUseFormByName.mockReturnValue({
      form: { uuid: deathNoteFormUuid, display: 'Death Note' },
      isLoading: false,
      error: undefined,
      isValidating: false,
    });
  });

  it('shows a loading indicator while the Death Note form is loading', () => {
    mockUseFormByName.mockReturnValue({
      form: undefined,
      isLoading: true,
      error: undefined,
      isValidating: false,
    });

    render(<MarkPatientDeceasedForm {...defaultProps} />);

    expect(screen.queryByTestId('form-widget-slot')).not.toBeInTheDocument();
    expect(screen.queryByText(/form not found/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when the Death Note form is not configured', () => {
    mockUseFormByName.mockReturnValue({
      form: undefined,
      isLoading: false,
      error: undefined,
      isValidating: false,
    });

    render(<MarkPatientDeceasedForm {...defaultProps} />);

    expect(screen.getByText(/form not found/i)).toBeInTheDocument();
    expect(screen.getByText(/death note.*could not be found/i)).toBeInTheDocument();
  });

  it('renders the form widget when the Death Note form is available', () => {
    render(<MarkPatientDeceasedForm {...defaultProps} />);

    expect(screen.getByTestId('visit-context-header-slot')).toBeInTheDocument();
    expect(screen.getByTestId('form-widget-slot')).toBeInTheDocument();

    const formWidgetCall = mockExtensionSlot.mock.calls.find((call) => call[0].name === 'form-widget-slot');
    expect(formWidgetCall?.[0].state.formUuid).toBe(deathNoteFormUuid);
    expect(formWidgetCall?.[0].state.patientUuid).toBe(mockPatient.id);
    expect(formWidgetCall?.[0].state.additionalProps).toEqual({ mode: 'enter' });
  });

  it('marks the patient deceased after the Death Note form is submitted', async () => {
    render(<MarkPatientDeceasedForm {...defaultProps} />);

    const formWidgetCall = mockExtensionSlot.mock.calls.find((call) => call[0].name === 'form-widget-slot');
    const handlePostResponse = formWidgetCall?.[0].state.handlePostResponse;

    await handlePostResponse({
      obs: [
        { concept: { uuid: '086be09f-2360-4907-ad02-caa69c0ddb71' }, value: '2024-01-03' },
        { concept: { uuid: 'f5f376d8-3351-487b-b283-63561e03859d' }, value: 'Septicemia' },
      ],
    });

    expect(mockMarkPatientDeceased).toHaveBeenCalledWith(expect.any(Date), mockPatient.id, undefined, 'Septicemia');
    expect(mockShowSnackbar).toHaveBeenCalledWith({
      title: 'Patient marked deceased successfully',
    });
  });
});
