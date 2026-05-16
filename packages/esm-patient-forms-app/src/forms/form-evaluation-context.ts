export interface FormEvaluationContext {
  patientGender?: 'M' | 'F' | 'O' | 'U';
  patientAgeYears?: number;
  isMedicoLegalCase?: boolean;
  mlcAttributeLoaded: boolean;
  activeDiagnosisCodes: string[];
  diagnosesLoaded: boolean;
  sessionLocationUuid?: string;
  locationTagDisplays: string[];
  locationTagsLoaded: boolean;
  visitTypeUuid?: string;
  visitTypeName?: string;
  roleDisplayNamesLower: string[];
  user:
    | { privileges?: Array<{ display?: string }>; roles?: Array<{ display?: string; name?: string }> }
    | null
    | undefined;
}
