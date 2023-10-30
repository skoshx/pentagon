import { z } from "../deps.ts";
import { listTableWithIndexPrefixes, read } from "./crud.ts";
import { PentagonKeyError } from "./errors.ts";
import { filterEntries } from "./search.ts";
import {
  AccessKey,
  KeyProperty,
  PentagonKey,
  QueryArgs,
  TableDefinition,
} from "./types.ts";
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
          `Error parsing property string '${keyPropertyString}'. Your schema has invalid properties. Properties ${
            KeyPropertySchema.options.join(
              ", ",
            )
          } are supported, you passed in '${key}'`,
        );
      }
    });

  if (parsedProperties.length > 1) {
    throw new Error(
      `Table '${tableName}' can't have more than one type of index for property '${property}'. You are using indexes ${
        parsedProperties.map((p) => `'${p}'`).join(" and ")
      }. Use only one of the index values 'primary', 'unique' or 'index'.`,
    );
  }

  return parsedProperties[0];
}

export function schemaToKeys<T extends ReturnType<typeof z.object>>(
  tableName: string,
  schema: T,
  values: Partial<z.input<T>>,
): PentagonKey[] {
  const accessKeys = schemaToAccessKeys(tableName, schema, values);
  const denoKeysArr = keysToIndexes(tableName, accessKeys);
  const pentagonKeys: PentagonKey[] = [];

  for (let i = 0; i < accessKeys.length; i++) {
    denoKeysArr[i].forEach((denoKey) => {
      pentagonKeys.push({
        accessKey: accessKeys[i],
        denoKey: denoKey,
      });
    });
  }

  return pentagonKeys;
}

export function schemaToAccessKeys<T extends ReturnType<typeof z.object>>(
  tableName: string,
  schema: T,
  values: Partial<z.input<T>>,
): AccessKey[] {
  const accessKeys = Object.entries(schema.shape).reduce(
    (current, [key, value]) => {
      const inputValue = values[key];

      if (!value.description || inputValue === undefined) {
        return current;
      }

      const keyType = parseKeyProperties(tableName, key, value.description);

      switch (keyType) {
        case "primary":
          current.push({
            value: inputValue,
            type: "primary",
          });
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
    throw new Error(
      `Table '${tableName}' can't have more than one primary key`,
    );
  }

  return accessKeys;
}

/**
 * Transforms `AccessKey` to `Deno.KvKey[]` used to filter items
 * @param tableName Name of the "table" (eg. "users")
 * @param accessKeys The `AccessKey[]` returned by `schemaToKeys()`
 */
function keysToIndexes(
  tableName: string,
  accessKeys: AccessKey[],
): Deno.KvKey[][] {
  const primaryKey = accessKeys.find(({ type }) => type === "primary");

  return accessKeys.map((accessKey) => {
    const accessKeyValueArr = (accessKey.value instanceof Array)
      ? accessKey.value
      : [accessKey.value];

    // Primary key
    if (accessKey.type === "primary") {
      return accessKeyValueArr.map(
        (accessKeyValue) => [tableName, accessKeyValue],
      );
    }

    // Unique indexed key
    if (accessKey.type === "unique") {
      return accessKeyValueArr.map(
        (accessKeyValue) => [`${tableName}${accessKey.suffix}`, accessKeyValue],
      );
    }

    // Non-unique indexed key
    if (accessKey.type === "index") {
      if (!primaryKey) {
        throw new Error(
          `Table '${tableName}' can't use a non-unique index without a primary index`,
        );
      }
      const primaryKeyValueArr = (primaryKey.value instanceof Array)
        ? primaryKey.value
        : [primaryKey.value];
      return accessKeyValueArr.map((accessKeyValue) =>
        primaryKeyValueArr.map(
          (primaryKeyValue) => [
            `${tableName}${accessKey.suffix}`,
            accessKeyValue,
            primaryKeyValue,
          ],
        )
      ).flat();
    }

    throw new Error("Invalid access key");
  });
}

export async function keysToItems<
  T extends TableDefinition,
>(
  kv: Deno.Kv,
  tableName: string,
  keys: PentagonKey[],
  where: QueryArgs<T>["where"],
  indexPrefixes: Deno.KvKey,
) {
  const entries = keys.length > 0
    ? await read<T>(kv, keys)
    : await listTableWithIndexPrefixes(kv, ...indexPrefixes);

  // Sort using `where`
  return filterEntries(entries, where);
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
    item.value = Object.keys(select).reduce(
      (previous, current) =>
        !isKeyOf(current, item.value) ? previous : {
          ...previous,
          [current]: item.value[current],
        },
      {} as Partial<z.output<T["schema"]>>,
    );

    return item;
  });
}

export function getIndexPrefixes<T extends ReturnType<typeof z.object>>(
  tableName: string,
  schema: T,
): Deno.KvKey {
  const indexPrefixes = Object.entries(schema.shape).reduce(
    (current, [indexKey, indexValue]) => {
      if (!indexValue.description) {
        return current;
      }

      const keyType = parseKeyProperties(
        tableName,
        indexKey,
        indexValue.description,
      );

      switch (keyType) {
        case "primary":
          current.push(tableName);
          break;
        case "unique":
          current.push(`${tableName}_by_unique_${indexKey}`);
          break;
        case "index":
          current.push(`${tableName}_by_${indexKey}`);
          break;
      }

      return current;
    },
    [] as string[],
  );
  return indexPrefixes;
}
