import { z } from "../deps.ts";
import { create, listTable, read, remove, update } from "./crud.ts";
import {
  keysToIndexes,
  schemaToKeys,
  selectFromEntry,
  whereToKeys,
} from "./keys.ts";
import { findItemsBySearch } from "./search.ts";
import { PentagonResult, TableDefinition } from "./types.ts";

export function createPentagon<T extends Record<string, TableDefinition>>(
  kv: Deno.Kv,
  schema: T,
) {
  const result: Partial<PentagonResult<T>> = {};

  // TODO: Run through schemas, validate `description`
  // TODO: Run through schemas, validate `relations` like Prisma
  // TODO: add all properties
  for (const [tableName, value] of Object.entries(schema)) {
    // @ts-ignore
    result[tableName as keyof T] = {
      create: async (createOrUpdateArgs) => {
        const keys = schemaToKeys(value.schema, createOrUpdateArgs.data);
        const indexKeys = keysToIndexes(tableName, keys);

        return await create(kv, tableName, createOrUpdateArgs.data, indexKeys);
      },
      delete: async (queryArgs) => {
        const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);

        return await remove(kv, indexKeys);
      },
      deleteMany: async (queryArgs) => {
        const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);

        return await remove(kv, indexKeys);
      },

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
        const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);
        const foundItems = await whereToKeys(
          kv,
          tableName,
          indexKeys,
          queryArgs.where ?? {},
        );

        // Include

        // Select
        const selectedItems = queryArgs.select
          ? selectFromEntry(foundItems, queryArgs.select)
          : foundItems;

        return selectedItems.map((item) => item.value);
      },

      // findFirst is just findMany[0]
      findFirst: async (queryArgs) => {
        const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);
        const foundItems = await whereToKeys(
          kv,
          tableName,
          indexKeys,
          queryArgs.where ?? {},
        );

        // Include
        const includedThing = await (async () => {
          const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
          const indexKeys = keysToIndexes(tableName, keys);
          // @todo: where in our case is our found items (Also we need to iterate foundItems, and add includes)
          // but it's foundItems .`userId` -> because `userId` is the foreign key
          const foundItems = await whereToKeys(
            kv,
            tableName,
            indexKeys,
            queryArgs.where ?? {},
          );

          return 2;
        })();

        // Select
        const selectedItems = queryArgs.select
          ? selectFromEntry(foundItems, queryArgs.select)
          : foundItems;

        return selectedItems.map((item) => item.value)?.[0];
        /* const keys = schemaToKeys(value.schema, queryArgs.where ?? []);
        const indexKeys = keysToIndexes(tableName, keys);

        if (indexKeys.length === 0) {
          const schemaItems = await listTable<
            z.infer<T[typeof tableName]["schema"]>
          >(kv, tableName);
          const foundItems = findItemsBySearch(
            schemaItems,
            queryArgs.where ?? {},
          );

          return await read(kv, foundItems.map((item) => item.key));
        }

        return await read(kv, indexKeys); */
      },
    };
  }
  return result as PentagonResult<T>;
}
