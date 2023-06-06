// @todo: move to something more solid at some point
export function isMatchingValue(a: any, b: any) {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  return a === b;
}

export function findItemsBySearch<T extends Deno.KvEntry<unknown>>(
  items: readonly T[],
  searchObj?: Partial<T> | undefined,
): T[] {
  return items.filter((item) =>
    Object.entries(searchObj ?? {}).every(([key, value]) =>
      isMatchingValue((item.value as Record<string, unknown>)?.[key], value)
      // (item.value as Record<string, unknown>)?.[key] === value
    )
  );
}
