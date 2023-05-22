import { z } from "../deps.ts";
import { listTable, newRead, read } from "./crud.ts";
import { PentagonKeyError } from "./errors.ts";
import { findItemsBySearch } from "./search.ts";
import { AccessKey, KeyProperty, QueryArgs, TableDefinition } from "./types.ts";

export const KeyPropertySchema = z.enum(["primary", "unique", "index"]);

export function parseKeyProperties(keyPropertyString: string): KeyProperty[] {
  const properties = keyPropertyString.split(",").map((key) => key.trim());
  const returnProperties: KeyProperty[] = [];
  for (let i = 0; i < properties.length; i++) {
    const { success } = KeyPropertySchema.safeParse(properties[i]);
    if (!success) {
      throw new PentagonKeyError(
        `Error parsing property string "${keyPropertyString}". Your schema has invalid properties. Properties TODO are supported, you passed in "${
          properties[i]
        }"`,
      );
    }

    returnProperties.push(properties[i] as KeyProperty);
  }

  return returnProperties;
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

export async function whereToKeys<T extends TableDefinition, IndexKeys extends readonly unknown[]>(
  kv: Deno.Kv,
  tableName: string,
  indexKeys: readonly [...{ [K in keyof IndexKeys]: Deno.KvKey }],
  where: QueryArgs<T>["where"],
) {
  const schemaItems = indexKeys.length > 0
    ? await newRead(kv, indexKeys)
    : await listTable(kv, tableName);
  
  // Sort using `where`

  // the cast to Deno.KvEntry here is unsafe
  // consider what happens when newRead does not return a match
  return findItemsBySearch(schemaItems as Deno.KvEntry<unknown>[], where);
}

export function selectFromEntry<T, Items = Partial<{ [K in keyof T]: true }>>(
  items: Deno.KvEntry<T>[],
  selectItems: Items,
  // @ts-expect-error: not sure how to get this to work without the `Type 'keyof Items' does not satisfy the constraint 'keyof T'` error.
): Deno.KvEntry<Pick<T, keyof Items>>[] {
  // @ts-expect-error: fix types
  const selectedValues: Deno.KvEntry<Pick<T, keyof Items>>[] = [
    ...items.map((i) => ({ ...i, value: {} })),
  ];

  // @ts-expect-error: don't know how to type this
  for (const [selectKey] of Object.entries(selectItems)) {
    // selectedValues
    for (let i = 0; i < selectedValues.length; i++) {
      // @ts-ignore: cant do types
      selectedValues[i].value[selectKey] = items[i].value[selectKey];
    }
  }

  return selectedValues;
}
