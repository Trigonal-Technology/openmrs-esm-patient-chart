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
