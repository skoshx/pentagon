import { z } from "../deps.ts";
import { QueryArgs } from "../mod.ts";
import { DatabaseValue, TableDefinition } from "./types.ts";
import { isKeyEntry, removeVersionstamp } from "./util.ts";

// @todo: move to something more solid at some point
export function isMatchingValue(a: DatabaseValue, b: DatabaseValue) {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (b instanceof Array) {
    return b.includes(a);
  }
  return a === b;
}

export function filterEntries<
  T extends TableDefinition,
>(
  items: Deno.KvEntryMaybe<z.output<T["schema"]>>[],
  where?: QueryArgs<T>["where"],
): Deno.KvEntry<z.output<T["schema"]>>[] {
  const filteredItems = items.filter(
    (item): item is Deno.KvEntry<z.output<T["schema"]>> => {
      if (!isKeyEntry(item)) {
        return false;
      }

      if (!where) {
        return true;
      }

      return Object.entries(removeVersionstamp(where)).every(([key, value]) =>
        isMatchingValue(
          item.value[key],
          value,
        )
      );
    },
  );

  return filteredItems;
}
