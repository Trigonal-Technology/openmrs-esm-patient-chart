import type { OrderConfigObject } from '../resources/order-config.resource';

export function getTimesPerDay(freqValue: string, orderConfig: OrderConfigObject): number {
  const f = orderConfig.orderFrequencies.find((x) => x.valueCoded === freqValue);
  const v = (f as { value?: string })?.value?.toLowerCase() ?? '';
  if (v.includes('once daily') || v.includes('od')) return 1;
  if (v.includes('twice daily') || v.includes('bid')) return 2;
  if (v.includes('three times daily') || v.includes('thrice daily') || v.includes('tid')) return 3;
  if (v.includes('four times daily') || v.includes('qid')) return 4;
  if (v.includes('every hour') || v.includes('q1h') || v.includes('qh')) return 24;
  if (v.includes('every two hours') || v.includes('every 2 hours') || v.includes('q2h')) return 12;
  if (v.includes('every three hours') || v.includes('every 3 hours') || v.includes('q3h')) return 8;
  if (v.includes('every four hours') || v.includes('every 4 hours') || v.includes('q4h')) return 6;
  if (v.includes('every six hours') || v.includes('every 6 hours') || v.includes('q6h')) return 4;
  if (v.includes('every eight hours') || v.includes('every 8 hours') || v.includes('q8h')) return 3;
  if (v.includes('every twelve hours') || v.includes('every 12 hours') || v.includes('q12h')) return 2;
  return 1;
}

export function getDurationDays(duration: number, durationUnits: string, orderConfig: OrderConfigObject): number {
  const u = orderConfig.durationUnits.find((x) => x.valueCoded === durationUnits);
  const v = (u as { value?: string })?.value?.toLowerCase() ?? '';
  if (v.includes('second')) return duration / (24 * 3600);
  if (v.includes('minute')) return duration / (24 * 60);
  if (v.includes('hour')) return duration / 24;
  if (v.includes('week')) return duration * 7;
  if (v.includes('month')) return duration * 30;
  if (v.includes('year')) return duration * 365;
  return duration;
}

export function calculateAutoQuantity(
  dose: number | null,
  frequency: string,
  duration: number | null,
  durationUnits: string,
  orderConfig: OrderConfigObject,
): number | null {
  if (!dose || !duration) return null;
  const timesPerDay = getTimesPerDay(frequency, orderConfig);
  const days = getDurationDays(duration, durationUnits, orderConfig);
  return Math.ceil(timesPerDay * days);
}
