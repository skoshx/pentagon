// @todo: make sure values confine to the limitations of the
// `structuralClone` algorithm.
export function isValidDatabaseValue() {}

export function mergeValueAndVersionstamp<
  T extends Deno.KvEntry<Record<string, unknown>>,
>(entry: T) {
  return {
    ...entry.value,
    versionstamp: entry.versionstamp,
  };
}

export function isKeyOf<T extends Record<string, unknown>>(
  value: string | number | symbol,
  record: T,
): value is keyof T {
  return value in record;
}
