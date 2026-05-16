/**
 * Form GET representation including {@code formRules} (nidancore / FormResourceNidan).
 * Keep in sync with {@code customFormRepresentation} in esm-patient-forms-app {@code constants.ts}.
 */
export const customFormRepresentationForMetadata =
  '(uuid,name,display,description,formRules,encounterType:(uuid,name,viewPrivilege,editPrivilege),version,published,retired,resources:(uuid,name,dataType,valueReference))';

/** Value for REST query param {@code v=} when loading a single form's metadata. */
export const formMetadataRestVParam = `custom:${customFormRepresentationForMetadata}`;
