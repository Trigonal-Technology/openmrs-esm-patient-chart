import type { Form } from '../types';
import type { FormEntryConfigSchema } from '../config-schema';

export const VISIBILITY_RULE_RESOURCE_NAMES = [
  'nidan-visibility-rules',
  'visibility-rules',
  'Visibility Rules',
] as const;

export interface FormVisibilityRule {
  gender?: 'M' | 'F' | 'O' | 'U';
  minAge?: number;
  maxAge?: number;
  requiredDiagnosisCodes?: string[];
  diagnosisMatchMode?: 'any' | 'all';
  /** Match if the session location has any of these tag labels (substring match, case-insensitive). */
  locationTags?: string[];
  excludeLocationTags?: string[];
  allowedLocationUuids?: string[];
  excludedLocationUuids?: string[];
  visitTypeUuids?: string[];
  requiredPrivileges?: string[];
  requiredRoles?: string[];
  sensitive?: boolean;
  forensicPrivilege?: string;
  displayTags?: string[];
}

/**
 * Merges deprecated single-value / alternate keys into the list-only shape and drops
 * unsupported fields (e.g. {@code visitTypeNames} — use {@code visitTypeUuids} instead).
 */
export function normalizeFormVisibilityRule(
  raw: FormVisibilityRule | Record<string, unknown> | null | undefined,
): FormVisibilityRule | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const r = { ...(raw as Record<string, unknown>) };

  const legacyLoc = r.locationTag;
  const locTags = Array.isArray(r.locationTags) ? [...(r.locationTags as string[])] : [];
  if (typeof legacyLoc === 'string' && legacyLoc.trim()) {
    locTags.unshift(legacyLoc.trim());
  }
  if (locTags.length) {
    r.locationTags = locTags;
  }
  delete r.locationTag;

  const legacyPriv = r.requiredPrivilege;
  const privs = Array.isArray(r.requiredPrivileges) ? [...(r.requiredPrivileges as string[])] : [];
  if (typeof legacyPriv === 'string' && legacyPriv.trim()) {
    privs.unshift(legacyPriv.trim());
  }
  if (privs.length) {
    r.requiredPrivileges = privs;
  }
  delete r.requiredPrivilege;

  const legacyRole = r.providerRole;
  const roles = Array.isArray(r.requiredRoles) ? [...(r.requiredRoles as string[])] : [];
  if (typeof legacyRole === 'string' && legacyRole.trim()) {
    roles.unshift(legacyRole.trim());
  }
  if (roles.length) {
    r.requiredRoles = roles;
  }
  delete r.providerRole;

  delete r.visitTypeNames;

  return r as FormVisibilityRule;
}

export function parseVisibilityRuleJson(json: string): FormVisibilityRule | undefined {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return normalizeFormVisibilityRule(parsed);
  } catch {
    return undefined;
  }
}

function rulesFromRestFormRules(form: Form): FormVisibilityRule | undefined {
  const v = form.formRules;
  if (v == null) {
    return undefined;
  }
  if (typeof v === 'string') {
    return parseVisibilityRuleJson(v.trim());
  }
  if (typeof v === 'object' && !Array.isArray(v)) {
    return normalizeFormVisibilityRule(v as Record<string, unknown>);
  }
  return undefined;
}

function extractRuleFromResources(resources: Form['resources']): FormVisibilityRule | undefined {
  if (!resources?.length) {
    return undefined;
  }
  for (const res of resources) {
    const nameMatch = VISIBILITY_RULE_RESOURCE_NAMES.some(
      (n) => res.name?.toLowerCase() === n.toLowerCase() || res.name === n,
    );
    if (nameMatch && res.valueReference) {
      const parsed = parseVisibilityRuleJson(res.valueReference.trim());
      if (parsed) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function getVisibilityRules(form: Form, config: FormEntryConfigSchema): FormVisibilityRule | undefined {
  const entry = config.formVisibilityRuleEntries?.find((e) => e.formUuid === form.uuid);
  if (entry?.rulesJson?.trim()) {
    const fromConfig = parseVisibilityRuleJson(entry.rulesJson.trim());
    if (fromConfig) {
      return fromConfig;
    }
  }

  const fromRest = rulesFromRestFormRules(form);
  if (fromRest) {
    return fromRest;
  }

  const fromResource = extractRuleFromResources(form.resources);
  if (fromResource) {
    return fromResource;
  }

  if (form.description?.trim().startsWith('{')) {
    return parseVisibilityRuleJson(form.description.trim());
  }

  return undefined;
}

export function ruleHasClinicalOrContextConstraints(rule: FormVisibilityRule | undefined): boolean {
  if (!rule) {
    return false;
  }
  return Boolean(
    rule.gender != null ||
      rule.minAge != null ||
      rule.maxAge != null ||
      (rule.requiredDiagnosisCodes?.length ?? 0) > 0 ||
      (rule.locationTags?.length ?? 0) > 0 ||
      (rule.excludeLocationTags?.length ?? 0) > 0 ||
      (rule.allowedLocationUuids?.length ?? 0) > 0 ||
      (rule.excludedLocationUuids?.length ?? 0) > 0 ||
      (rule.visitTypeUuids?.length ?? 0) > 0 ||
      (rule.requiredPrivileges?.length ?? 0) > 0 ||
      (rule.requiredRoles?.length ?? 0) > 0 ||
      rule.sensitive === true,
  );
}
