// @todo: make sure values confine to the limitations of the

import { WithMaybeVersionstamp, WithVersionstamp } from "../mod.ts";

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

export function isKeyEntry<T>(
  entry: Deno.KvEntryMaybe<T>,
): entry is Deno.KvEntry<T> {
  return entry.value !== null && entry.versionstamp !== null;
}

export function removeVersionstamp<
  T extends { versionstamp?: string | undefined | null },
>(
  item: T,
) {
  const { versionstamp: _, ...rest } = item;

  return rest;
}

export function removeVersionstamps<
  T extends { versionstamp?: string | undefined | null },
>(
  items: T[],
) {
  return items.map(removeVersionstamp);
}
