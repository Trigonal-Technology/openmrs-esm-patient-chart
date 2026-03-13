import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenuItem } from '@carbon/react';
import { useSWRConfig } from 'swr';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import {
  invalidateCurrentVisit,
  invalidateVisitAndEncounterData,
} from '@openmrs/esm-patient-common-lib';
import { markPatientDeceased } from '../data.resource';
import styles from './action-button.scss';

interface MarkPatientDeceasedOverflowMenuItemProps {
  patientUuid?: string;
  patient?: fhir.Patient;
  closeMenu?: () => void;
}

const MarkPatientDeceasedOverflowMenuItem: React.FC<MarkPatientDeceasedOverflowMenuItemProps> = ({
  patient,
  closeMenu,
}) => {
  const { t } = useTranslation();
  const { mutate: globalMutate } = useSWRConfig();
  const isDead = patient.deceasedBoolean ?? Boolean(patient.deceasedDateTime);

  const handleLaunchModal = useCallback(() => launchWorkspace2('mark-patient-deceased-workspace-form'), []);

  return (
    patient &&
    !isDead && (
      <OverflowMenuItem
        className={styles.menuitem}
        itemText={t('markPatientDeceased', 'Mark patient deceased')}
        onClick={handleLaunchModal}
        closeMenu={closeMenu}
      />
    )
  );
};

export default MarkPatientDeceasedOverflowMenuItem;
