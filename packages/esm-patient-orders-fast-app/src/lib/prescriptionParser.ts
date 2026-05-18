import type { DrugSearchResult } from '../resources/drug-search.resource';
import type { OrderConfigObject } from '../resources/order-config.resource';

export interface FastDrug {
  uuid: string;
  name: string;
  display: string;
  concept: string;
  commonDoses: number[];
  defaultDoseUnit: string;
  defaultRoute: string;
}

export interface ParsedPrescription {
  drug: FastDrug | null;
  dose: number | null;
  doseUnits: string | null;
  route: string | null;
  frequency: string | null;
  duration: number | null;
  durationUnits: string | null;
  asNeeded: boolean;
  raw: string;
  confidence: number;
}

const ROUTE_ABBREV_MAP: Record<string, string> = {
  po: 'oral',
  oral: 'oral',
  iv: 'intravenous',
  intravenous: 'intravenous',
  im: 'intramuscular',
  intramuscular: 'intramuscular',
  sc: 'subcutaneous',
  subcutaneous: 'subcutaneous',
  top: 'topical',
  topical: 'topical',
  pr: 'rectal',
  rectal: 'rectal',
};

const DOSE_UNIT_ABBREV_MAP: Record<string, string> = {
  mg: 'milligram',
  gram: 'gram',
  g: 'gram',
  ml: 'milliliter',
  milliliter: 'milliliter',
  tab: 'tablet',
  tablet: 'tablet',
  cap: 'capsule',
  capsule: 'capsule',
};

const FREQ_ABBREV_MAP: Record<string, string> = {
  od: 'once daily',
  bid: 'twice daily',
  tid: 'three times daily',
  qid: 'four times daily',
  q1h: 'every hour',
  qh: 'every hour',
  q2h: 'every 2 hours',
  q3h: 'every 3 hours',
  q4h: 'every 4 hours',
  q6h: 'every 6 hours',
  q8h: 'every 8 hours',
  q12h: 'every 12 hours',
  stat: 'immediately',
};

const DURATION_ABBREV_MAP: Record<string, string> = {
  s: 'second',
  sec: 'second',
  second: 'second',
  seconds: 'second',
  m: 'minute',
  min: 'minute',
  minute: 'minute',
  minutes: 'minute',
  h: 'hour',
  hr: 'hour',
  hour: 'hour',
  hours: 'hour',
  d: 'day',
  day: 'day',
  days: 'day',
  wk: 'week',
  week: 'week',
  weeks: 'week',
  wks: 'week',
  mo: 'month',
  month: 'month',
  months: 'month',
  y: 'year',
  yr: 'year',
  year: 'year',
  years: 'year',
};

function parseStrengthToDoses(strength: string): number[] {
  const nums = strength.match(/\d+\.?\d*/g);
  if (!nums) return [500];
  return nums.map(Number).filter((n) => n > 0 && n < 10000);
}

export function drugSearchResultToFastDrug(
  d: DrugSearchResult,
  defaultDoseUnit: string,
  defaultRoute: string,
): FastDrug {
  const doses = parseStrengthToDoses(d.strength || '500');
  return {
    uuid: d.uuid,
    name: d.display || d.name,
    display: d.display || d.name,
    concept: d.concept?.uuid ?? '',
    commonDoses: doses.length > 0 ? doses : [500],
    defaultDoseUnit: d.dosageForm?.uuid || defaultDoseUnit,
    defaultRoute,
  };
}

function findBestMatch<T extends { value: string; valueCoded: string }>(
  items: T[],
  text: string,
  abbrevMap: Record<string, string>,
): string | null {
  const lower = text.toLowerCase();
  for (const item of items) {
    const displayLower = item.value.toLowerCase();
    if (displayLower.includes(lower) || lower.includes(displayLower)) return item.valueCoded;
    for (const [abbr, canonical] of Object.entries(abbrevMap)) {
      if (displayLower.includes(canonical) && new RegExp(`\\b${abbr}\\b`, 'i').test(text)) {
        return item.valueCoded;
      }
    }
  }
  return null;
}

export function parsePrescription(
  input: string,
  drugs: FastDrug[],
  orderConfig: OrderConfigObject,
): ParsedPrescription {
  const text = input.trim();
  const lower = text.toLowerCase();
  let matched = 0;
  const total = 5;

  // Sort drugs by length descending to match more specific names first (e.g. "Paracetamol 500mg" before "Paracetamol")
  const sortedDrugs = [...drugs].sort((a, b) => b.name.length - a.name.length);

  let drug: FastDrug | null = null;
  for (const d of sortedDrugs) {
    const drugNameLower = d.name.toLowerCase();
    const drugDisplayLower = d.display.toLowerCase();

    // Check if the full drug name or display name is present as a word/phrase
    const nameRegex = new RegExp(`\\b${drugNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const displayRegex = new RegExp(`\\b${drugDisplayLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

    if (nameRegex.test(text) || displayRegex.test(text)) {
      drug = d;
      break;
    }

    // fallback to component matches if no full match
    const components = drugNameLower.split(/[\s()]+/).filter((c) => c.length > 2);
    if (components.length > 0 && components.every((c) => new RegExp(`\\b${c}\\b`, 'i').test(text))) {
      drug = d;
      break;
    }
  }
  if (drug) matched++;

  let dose: number | null = null;
  let doseUnits: string | null = null;
  const doseRegex = /(\d+\.?\d*)\s*(mg|g|ml|tab|cap)\b/i;
  const doseMatch = text.match(doseRegex);
  if (doseMatch) {
    dose = parseFloat(doseMatch[1]);
    const unitKey = doseMatch[2].toLowerCase();
    const match = orderConfig.drugDosingUnits.find((u) => {
      const v = u.value.toLowerCase();
      return v.includes(DOSE_UNIT_ABBREV_MAP[unitKey] || unitKey) || v.includes(unitKey);
    });
    doseUnits = match?.valueCoded ?? drug?.defaultDoseUnit ?? orderConfig.drugDosingUnits[0]?.valueCoded ?? null;
    matched++;
  } else {
    const numMatch = text.match(/\b(\d+\.?\d*)\b/);
    if (numMatch) {
      dose = parseFloat(numMatch[1]);
      doseUnits = drug?.defaultDoseUnit ?? orderConfig.drugDosingUnits[0]?.valueCoded ?? null;
      matched += 0.5;
    }
  }

  let route: string | null = null;
  for (const [abbr] of Object.entries(ROUTE_ABBREV_MAP)) {
    const routeRegex = new RegExp(`\\b${abbr}\\b`, 'i');
    if (routeRegex.test(text)) {
      const match = orderConfig.drugRoutes.find((r) => {
        const v = r.value.toLowerCase();
        return v.includes(ROUTE_ABBREV_MAP[abbr]) || v.includes(abbr);
      });
      route = match?.valueCoded ?? drug?.defaultRoute ?? orderConfig.drugRoutes[0]?.valueCoded ?? null;
      matched++;
      break;
    }
  }

  let frequency: string | null = null;
  for (const [abbr] of Object.entries(FREQ_ABBREV_MAP)) {
    const freqRegex = new RegExp(`\\b${abbr}\\b`, 'i');
    if (freqRegex.test(text)) {
      const match = orderConfig.orderFrequencies.find((f) => {
        const v = (f.value || '').toLowerCase();
        const names = (f as { names?: string[] }).names ?? [];
        return v.includes(FREQ_ABBREV_MAP[abbr]) || names.some((n) => n.toLowerCase().includes(abbr));
      });
      frequency = match?.valueCoded ?? orderConfig.orderFrequencies[0]?.valueCoded ?? null;
      matched++;
      break;
    }
  }
  if (!frequency) {
    const longFormMap: Record<string, string> = {
      'once daily': 'od',
      'twice daily': 'bid',
      'three times daily': 'tid',
      'four times daily': 'qid',
      'thrice daily': 'tid',
      'once a day': 'od',
      'twice a day': 'bid',
      'every hour': 'q1h',
      'every two hours': 'q2h',
      'every 2 hours': 'q2h',
      'every three hours': 'q3h',
      'every 3 hours': 'q3h',
      'every four hours': 'q4h',
      'every 4 hours': 'q4h',
      'every six hours': 'q6h',
      'every 6 hours': 'q6h',
      'every eight hours': 'q8h',
      'every 8 hours': 'q8h',
      'every twelve hours': 'q12h',
      'every 12 hours': 'q12h',
    };
    for (const [phrase, abbr] of Object.entries(longFormMap)) {
      if (lower.includes(phrase)) {
        const match = orderConfig.orderFrequencies.find((f) => {
          const v = (f.value || '').toLowerCase();
          return v.includes(phrase) || v.includes(abbr);
        });
        frequency = match?.valueCoded ?? orderConfig.orderFrequencies[0]?.valueCoded ?? null;
        if (frequency) matched++;
        break;
      }
    }
  }

  let duration: number | null = null;
  let durationUnits: string | null = null;
  const durUnits = Object.keys(DURATION_ABBREV_MAP)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const durRegex = new RegExp(`(?:x|for|×)\\s*(\\d+)\\s*(${durUnits})`, 'i');
  const durMatch = text.match(durRegex);
  if (durMatch) {
    duration = parseInt(durMatch[1], 10);
    const key = durMatch[2].toLowerCase();
    const canonical = DURATION_ABBREV_MAP[key];
    const match = orderConfig.durationUnits.find((u) => {
      const v = u.value.toLowerCase();
      return v.includes(canonical) || v.includes(key);
    });
    durationUnits = match?.valueCoded ?? orderConfig.durationUnits[0]?.valueCoded ?? null;
    matched++;
  } else {
    const durRegex2 = new RegExp(`(\\d+)\\s*(${durUnits})\\b`, 'i');
    const durMatch2 = text.match(durRegex2);
    if (durMatch2) {
      duration = parseInt(durMatch2[1], 10);
      const key = durMatch2[2].toLowerCase();
      const canonical = DURATION_ABBREV_MAP[key];
      const match = orderConfig.durationUnits.find((u) => {
        const v = u.value.toLowerCase();
        return v.includes(canonical) || v.includes(key);
      });
      durationUnits = match?.valueCoded ?? orderConfig.durationUnits[0]?.valueCoded ?? null;
      matched++;
    }
  }

  const asNeeded = /\bprn\b/i.test(text) || /\bas\s*needed\b/i.test(text);

  return {
    drug,
    dose,
    doseUnits,
    route,
    frequency,
    duration,
    durationUnits,
    asNeeded,
    raw: text,
    confidence: matched / total,
  };
}
