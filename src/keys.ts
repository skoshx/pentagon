import { z } from "../deps.ts";
import { removeVersionstamp } from "../test/util.ts";
import { listTable, read } from "./crud.ts";
import { PentagonKeyError } from "./errors.ts";
import { findItemsBySearch } from "./search.ts";
import { AccessKey, KeyProperty, QueryArgs, TableDefinition } from "./types.ts";
import { isKeyOf } from "./util.ts";

export const KeyPropertySchema = z.enum(["primary", "unique", "index"]);

export function parseKeyProperties(
  tableName: string,
  property: string,
  keyPropertyString: string,
): KeyProperty | undefined {
  const parsedProperties = keyPropertyString
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

  if (parsedProperties.length > 1) {
    throw new Error(
      `Table '${tableName}' can't have more than one type of index for property ${property}`,
    );
  }

  return parsedProperties[0];
}

export function schemaToKeys<T extends ReturnType<typeof z.object>>(
  tableName: string,
  schema: T,
  values: Partial<z.input<T>>,
): AccessKey[] {
  const accessKeys = Object.entries(schema.shape).reduce(
    (current, [key, value]) => {
      const inputValue = values[key];

      if (!value.description || !inputValue) {
        return current;
      }

      const keyType = parseKeyProperties(tableName, key, value.description);

      switch (keyType) {
        case "primary":
          current.push({ value: inputValue, type: "primary" });
          break;
        case "unique":
          current.push({
            value: inputValue,
            type: "unique",
            suffix: `_by_unique_${key}`,
          });
          break;
        case "index":
          current.push({
            value: inputValue,
            type: "index",
            suffix: `_by_${key}`,
          });
          break;
      }

      return current;
    },
    [] as AccessKey[],
  );

  const primaryKeys = accessKeys.filter(({ type }) => type === "primary");

  if (primaryKeys.length > 1) {
    throw new Error(`Table ${tableName} Can't have more than one primary key`);
  }

  return accessKeys;
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
  const primaryKey = accessKeys.find(({ type }) => type === "primary");

  return accessKeys.map((accessKey) => {
    // Primary key
    if (accessKey.type === "primary") {
      return [tableName, accessKey.value];
    }

    // Unique indexed key
    if (accessKey.type === "unique") {
      return [`${tableName}${accessKey.suffix}`, accessKey.value];
    }

    // Non-unique indexed key
    if (accessKey.type === "index") {
      if (!primaryKey) {
        throw new Error(
          `Table '${tableName}' can't use a non-unique index without a primary index`,
        );
      }

      return [
        `${tableName}${accessKey.suffix}`,
        accessKey.value,
        primaryKey.value,
      ];
    }

    throw new Error("Invalid access key");
  });
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
