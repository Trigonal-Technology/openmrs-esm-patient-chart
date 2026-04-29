export function findValueCodedByDisplay<T extends { valueCoded: string; value: string }>(
  items: T[],
  display: string,
): string {
  const lower = display?.toLowerCase() ?? '';
  const match = items.find(
    (i) =>
      i.valueCoded === display ||
      i.value?.toLowerCase().includes(lower) ||
      lower.includes(i.value?.toLowerCase() ?? ''),
  );
  return match?.valueCoded ?? items[0]?.valueCoded ?? display;
}

export function getDisplayForConfig<T extends { valueCoded: string; value: string }>(
  items: T[],
  valueCoded: string,
): string {
  const match = items.find((i) => i.valueCoded === valueCoded);
  return match?.value ?? valueCoded;
}
export function findValueCodedById<T extends { valueCoded: string; conceptId?: number }>(
  items: T[],
  id?: number,
): string | undefined {
  if (id === undefined) return undefined;
  const match = items.find((i) => i.conceptId === id);
  return match?.valueCoded;
}
