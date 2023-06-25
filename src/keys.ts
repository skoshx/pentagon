import { z } from "../deps.ts";
import { removeVersionstamp } from "../test/util.ts";
import { listTable, read } from "./crud.ts";
import { PentagonKeyError } from "./errors.ts";
import { findItemsBySearch } from "./search.ts";
import { AccessKey, KeyProperty, QueryArgs, TableDefinition } from "./types.ts";
import { isKeyOf } from "./util.ts";

export const KeyPropertySchema = z.enum(["primary", "unique", "index"]);

export function parseKeyProperties(keyPropertyString: string): KeyProperty[] {
  return keyPropertyString
    .split(",")
    .map((key) => key.trim())
    .map((key) => {
      try {
        return KeyPropertySchema.parse(key);
      } catch {
        throw new PentagonKeyError(
          `Error parsing property string "${keyPropertyString}". Your schema has invalid properties. Properties ${
            KeyPropertySchema.options.join(
              ", ",
            )
          } are supported, you passed in "${key}"`,
        );
      }
    });
}

export function schemaToKeys<T extends ReturnType<typeof z.object>>(
  schema: T,
  values: Partial<z.input<T>>,
): AccessKey[] {
  const keys: AccessKey[] = [];

  for (const [key, value] of Object.entries(schema.shape)) {
    if (value.description) {
      const parsedProperties = parseKeyProperties(value.description);
      const inputValue = values[key];
      if (!inputValue) continue;

      const newKey: AccessKey = { value: inputValue };

      for (let i = 0; i < parsedProperties.length; i++) {
        if (parsedProperties[i] === "primary") {
          newKey.primary = true;
        }
        if (parsedProperties[i] === "unique") {
          newKey.unique = true;
        }
        if (parsedProperties[i] === "index") {
          newKey.suffix = `_by_${key}`;
        }
      }

      keys.push(newKey);
    }
  }

  return keys;
}

/**
 * Transforms `AccessKey` to `Deno.KvKey[]` used to filter items
 * @param tableName Name of the "table" (eg. "users")
 * @param accessKeys The `AccessKey[]` returned by `schemaToKeys()`
 */
export function keysToIndexes(
  tableName: string,
  accessKeys: AccessKey[],
): Deno.KvKey[] {
  const keys: Deno.KvKey[] = [];

  for (let i = 0; i < accessKeys.length; i++) {
    // Primary key values
    if (accessKeys[i].primary) {
      keys.push([tableName, accessKeys[i].value]);
      continue;
    }
    // Indexed values
    if (accessKeys[i].suffix) {
      keys.push([`${tableName}${accessKeys[i].suffix}`, accessKeys[i].value]);
      continue;
    }
  }

  return keys;
}

export async function whereToKeys<
  T extends TableDefinition,
  IndexKeys extends readonly unknown[],
>(
  kv: Deno.Kv,
  tableName: string,
  indexKeys: readonly [...{ [K in keyof IndexKeys]: Deno.KvKey }],
  where: QueryArgs<T>["where"],
) {
  const schemaItems = indexKeys.length > 0
    ? await read(kv, indexKeys)
    : await listTable(kv, tableName);

  // Sort using `where`

  // the cast to Deno.KvEntry here is unsafe
  // consider what happens when read does not return a match
  return findItemsBySearch(
    schemaItems as Deno.KvEntry<z.output<T["schema"]>>[],
    where && removeVersionstamp(where),
  );
}

export function selectFromEntries<
  T extends TableDefinition,
  Q extends QueryArgs<T>,
  S extends NonNullable<Q["select"]>,
>(
  items: Deno.KvEntry<z.output<T["schema"]>>[],
  select: S,
): Deno.KvEntry<Pick<z.output<T["schema"]>, keyof S & string>>[] {
  return items.map((item) => {
    item.value = Object.keys(select).reduce<Partial<T["schema"]>>(
      (previous, current) =>
        !isKeyOf(current, item.value) ? previous : {
          ...previous,
          [current]: item.value[current],
        },
      {},
    );

    return item;
  });
}
