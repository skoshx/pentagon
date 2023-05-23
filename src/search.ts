export function findItemsBySearch<T extends Deno.KvEntry<unknown>>(
  items: readonly T[],
  searchObj?: Partial<T> | undefined,
): T[] {
  return items.filter((item) =>
    Object.entries(searchObj ?? {}).every(([key, value]) =>
      (item.value as Record<string, unknown>)?.[key] === value
    )
  );
}
