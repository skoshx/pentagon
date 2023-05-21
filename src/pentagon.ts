import { z } from "../deps.ts";
import { create, findMany, listTable, read, remove, update } from "./crud.ts";
import { keysToIndexes, schemaToKeys } from "./keys.ts";
import { findItemsBySearch } from "./search.ts";
import { PentagonResult, TableDefinition } from "./types.ts";

export function createPentagon<T extends Record<string, TableDefinition>>(
  kv: Deno.Kv,
  schema: T,
) {
  const result: Partial<PentagonResult<T>> = {};
  // @todo(skoshx): Run through schemas, validate `description`
  // @todo(skoshx): Run through schemas, validate `relations`
  // @todo(skoshx): Add all properties
  for (const [tableName, value] of Object.entries(schema)) {
    // @ts-ignore
    result[tableName as keyof T] = {
      create: async (createOrUpdateArgs) => {
        const keys = schemaToKeys(value.schema, createOrUpdateArgs.data);
        const indexKeys = keysToIndexes(tableName, keys);

        return await create(kv, tableName, createOrUpdateArgs.data, indexKeys);
      },
      // @todo(skoshx): refactor these using `whereToKeys` function
      // like we refactored `findMany` and `findFirst`
      delete: async (queryArgs) => {
        const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);

        return await remove(kv, indexKeys);
      },
      // @todo(skoshx): refactor these using `whereToKeys` function
      // like we refactored `findMany` and `findFirst`
      deleteMany: async (queryArgs) => {
        const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);

        return await remove(kv, indexKeys);
      },

      // @todo(skoshx): refactor these using `whereToKeys` function
      // like we refactored `findMany` and `findFirst`
      update: async (updateArgs) => {
        const keys = schemaToKeys(value.schema, updateArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);

        if (indexKeys.length === 0) {
          const schemaItems = await listTable<
            z.infer<T[typeof tableName]["schema"]>
          >(kv, tableName);
          const foundItems = findItemsBySearch(
            schemaItems,
            updateArgs.where ?? {},
          );
          if (foundItems.length === 0) return;
          const updatedData = {
            ...foundItems[0].value,
            ...updateArgs.data,
          };

          // @ts-ignore
          return await update(
            kv,
            tableName,
            updatedData,
            foundItems.map((item) => item.key),
          );
        }

        const readOne = await read(kv, indexKeys);

        const updatedData = {
          ...readOne,
          ...updateArgs.data,
        };

        // @ts-ignore
        return await update(kv, tableName, updatedData, indexKeys);
      },

      findMany: async (queryArgs) => {
        // @ts-ignore
        return await findMany(kv, tableName, value, queryArgs);
      },

      // findFirst is just findMany[0]
      findFirst: async (queryArgs) => {
        // @ts-ignore
        return (await findMany(kv, tableName, value, queryArgs))?.[0];
      },
    };
  }
  return result as PentagonResult<T>;
}
