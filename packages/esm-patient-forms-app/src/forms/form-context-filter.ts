import { userHasAccess } from '@openmrs/esm-framework';
import type { FormEntryConfigSchema } from '../config-schema';
import type { CompletedFormInfo, Form } from '../types';
import type { FormEvaluationContext } from './form-evaluation-context';
import {
  getVisibilityRules,
  ruleHasClinicalOrContextConstraints,
  type FormVisibilityRule,
} from './form-visibility.schema';

export const DEFAULT_FORENSIC_PRIVILEGE = 'App: Access Forensic Data';

export function mapFhirGenderToMFUO(gender: fhir.Patient['gender']): 'M' | 'F' | 'O' | 'U' | undefined {
  switch (gender) {
    case 'male':
      return 'M';
    case 'female':
      return 'F';
    case 'other':
      return 'O';
    case 'unknown':
      return 'U';
    default:
      return undefined;
  }
}

export function computeAgeYearsFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) {
    return undefined;
  }
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return undefined;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : undefined;
}

function normalizeToken(s: string): string {
  return s.trim().toLowerCase();
}

function tagListIncludes(tagsLower: string[], wanted: string): boolean {
  const w = normalizeToken(wanted);
  if (!w) {
    return false;
  }
  return tagsLower.some((t) => t === w || t.includes(w) || w.includes(t));
}

export function matchesAgeRange(rule: FormVisibilityRule, ageYears: number | undefined): boolean {
  if (rule.minAge != null) {
    if (ageYears == null || ageYears < rule.minAge) {
      return false;
    }
  }
  if (rule.maxAge != null) {
    if (ageYears == null || ageYears > rule.maxAge) {
      return false;
    }
  }
  return true;
}

export function matchesGender(rule: FormVisibilityRule, gender: 'M' | 'F' | 'O' | 'U' | undefined): boolean {
  if (!rule.gender) {
    return true;
  }
  if (!gender) {
    return false;
  }
  return rule.gender === gender;
}

export function matchesDiagnoses(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  const required = rule.requiredDiagnosisCodes?.filter(Boolean) ?? [];
  if (required.length === 0) {
    return true;
  }
  if (!ctx.diagnosesLoaded) {
    return true;
  }
  const codes = ctx.activeDiagnosisCodes.map((c) => normalizeToken(c));
  const mode = rule.diagnosisMatchMode ?? 'any';

  const matchesOne = (req: string) => {
    const r = normalizeToken(req);
    return codes.some((c) => c === r || c.includes(r) || r.includes(c));
  };

  if (mode === 'all') {
    return required.every(matchesOne);
  }
  return required.some(matchesOne);
}

export function matchesLocationTags(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  const wantsTag = (rule.locationTags?.length ?? 0) > 0;
  if (!wantsTag) {
    return true;
  }
  if (!ctx.locationTagsLoaded) {
    return true;
  }
  const candidates = (rule.locationTags ?? []).filter(Boolean) as string[];
  return candidates.some((c) => tagListIncludes(ctx.locationTagDisplays, c));
}

export function matchesLocationConstraints(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  const uuid = ctx.sessionLocationUuid;

  if (rule.excludedLocationUuids?.length && uuid && rule.excludedLocationUuids.includes(uuid)) {
    return false;
  }

  if (rule.allowedLocationUuids?.length) {
    if (!uuid || !rule.allowedLocationUuids.includes(uuid)) {
      return false;
    }
  }

  if (ctx.locationTagsLoaded && rule.excludeLocationTags?.length) {
    for (const ex of rule.excludeLocationTags) {
      if (tagListIncludes(ctx.locationTagDisplays, ex)) {
        return false;
      }
    }
  }

  const needsPositiveTag = (rule.locationTags?.length ?? 0) > 0;
  if (needsPositiveTag && ctx.locationTagsLoaded && !matchesLocationTags(rule, ctx)) {
    return false;
  }

  return true;
}

export function matchesVisit(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  if (rule.visitTypeUuids?.length) {
    const v = ctx.visitTypeUuid;
    if (!v || !rule.visitTypeUuids.includes(v)) {
      return false;
    }
  }

  return true;
}

export function matchesPrivileges(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  const privs = (rule.requiredPrivileges ?? []).filter(Boolean);
  for (const priv of privs) {
    if (!ctx.user || !userHasAccess(priv, ctx.user as Parameters<typeof userHasAccess>[1])) {
      return false;
    }
  }
  return true;
}

export function matchesRoles(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  const roles = (rule.requiredRoles ?? []).filter(Boolean);
  if (!roles.length) {
    return true;
  }
  if (!ctx.roleDisplayNamesLower.length) {
    return false;
  }
  return roles.some((r) => ctx.roleDisplayNamesLower.includes(normalizeToken(r)));
}

export function matchesSensitive(rule: FormVisibilityRule, ctx: FormEvaluationContext): boolean {
  if (!rule.sensitive) {
    return true;
  }

  const forensicPriv = rule.forensicPrivilege ?? DEFAULT_FORENSIC_PRIVILEGE;
  if (!ctx.user || !userHasAccess(forensicPriv, ctx.user as Parameters<typeof userHasAccess>[1])) {
    return false;
  }

  if (!ctx.mlcAttributeLoaded) {
    return false;
  }

  return ctx.isMedicoLegalCase === true;
}

export function formMatchesContext(
  form: Form,
  rule: FormVisibilityRule | undefined,
  ctx: FormEvaluationContext,
  _config: FormEntryConfigSchema,
): boolean {
  if (!rule || !ruleHasClinicalOrContextConstraints(rule)) {
    return true;
  }

  if (!matchesSensitive(rule, ctx)) {
    return false;
  }

  if (!matchesGender(rule, ctx.patientGender)) {
    return false;
  }

  if (!matchesAgeRange(rule, ctx.patientAgeYears)) {
    return false;
  }

  if (!matchesDiagnoses(rule, ctx)) {
    return false;
  }

  if (!matchesLocationConstraints(rule, ctx)) {
    return false;
  }

  if (!matchesVisit(rule, ctx)) {
    return false;
  }

  if (!matchesPrivileges(rule, ctx)) {
    return false;
  }

  if (!matchesRoles(rule, ctx)) {
    return false;
  }

  return true;
}

export function filterFormsByContext(
  forms: Array<CompletedFormInfo>,
  ctx: FormEvaluationContext,
  config: FormEntryConfigSchema,
): Array<CompletedFormInfo> {
  if (!config.contextualFormFiltering) {
    return forms;
  }
  return forms.filter((fi) => formMatchesContext(fi.form, getVisibilityRules(fi.form, config), ctx, config));
}

export function partitionFormsByGroup(
  visibleForms: Array<CompletedFormInfo>,
  config: FormEntryConfigSchema,
): { recommended: Array<CompletedFormInfo>; general: Array<CompletedFormInfo> } {
  const recommended: Array<CompletedFormInfo> = [];
  const general: Array<CompletedFormInfo> = [];

  for (const fi of visibleForms) {
    const rule = getVisibilityRules(fi.form, config);
    if (
      rule &&
      ((rule.locationTags?.length ?? 0) > 0 ||
        (rule.allowedLocationUuids?.length ?? 0) > 0 ||
        (rule.visitTypeUuids?.length ?? 0) > 0)
    ) {
      recommended.push(fi);
    } else {
      general.push(fi);
    }
  }

  return { recommended, general };
}

export function getDisplayTagsForForm(form: Form, config: FormEntryConfigSchema): string[] {
  const rule = getVisibilityRules(form, config);
  return rule?.displayTags?.filter(Boolean) ?? [];
}
