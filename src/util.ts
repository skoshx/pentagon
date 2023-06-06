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
