export function findItemsBySearch<T extends Deno.KvEntry<unknown>>(
  items: T[],
  searchObj: Partial<T>,
): T[] {
  return items.filter((item) => {
    return Object.entries(searchObj).every(([key, value]) => {
      // @ts-ignore
      return item.value[key] === value;
    });
  });
}
