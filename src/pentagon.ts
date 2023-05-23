import { z } from "../deps.ts";
import { create, findMany, listTable, read, remove, update } from "./crud.ts";
import { keysToIndexes, schemaToKeys } from "./keys.ts";
import { findItemsBySearch } from "./search.ts";
import type {
  PentagonMethods,
  PentagonResult,
  TableDefinition,
} from "./types.ts";

export function createPentagon<T extends Record<string, TableDefinition>>(
  kv: Deno.Kv,
  schema: T,
) {
  // @todo(skoshx): Run through schemas, validate `description`
  // @todo(skoshx): Run through schemas, validate `relations`
  // @todo(skoshx): Add all properties
  const result = Object.fromEntries(
    Object.entries(schema).map(([tableName, tableDefinition]) => {
      const methods: PentagonMethods<typeof tableDefinition> = {
        create: (createOrUpdateArgs) =>
          createImpl(kv, tableName, tableDefinition, createOrUpdateArgs),
        delete: (queryArgs) =>
          deleteImpl(kv, tableName, tableDefinition, queryArgs),
        deleteMany: (queryArgs) =>
          deleteManyImpl(kv, tableName, tableDefinition, queryArgs),
        update: (queryArgs) =>
          updateImpl(kv, tableName, tableDefinition, queryArgs),
        findMany: (queryArgs) =>
          findManyImpl(kv, tableName, tableDefinition, queryArgs),
        findFirst: (queryArgs) =>
          findFirstImpl(kv, tableName, tableDefinition, queryArgs),
      };

      return [tableName, methods];
    }),
  );

  return result as PentagonResult<T>;
}

async function createImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  createOrUpdateArgs: Parameters<PentagonMethods<T>["create"]>[0],
): ReturnType<PentagonMethods<T>["create"]> {
  const keys = schemaToKeys(tableDefinition.schema, createOrUpdateArgs.data);
  const indexKeys = keysToIndexes(tableName, keys);

  return await create(kv, tableName, createOrUpdateArgs.data, indexKeys);
}

// @todo(skoshx): refactor these using `whereToKeys` function
// like we refactored `findMany` and `findFirst`
async function deleteImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: TableDefinition,
  queryArgs: Parameters<PentagonMethods<T>["delete"]>[0],
): ReturnType<PentagonMethods<T>["delete"]> {
  const keys = schemaToKeys(tableDefinition.schema, queryArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);

  return await remove(kv, indexKeys);
}

// @todo(skoshx): refactor these using `whereToKeys` function
// like we refactored `findMany` and `findFirst`
async function deleteManyImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: TableDefinition,
  queryArgs: Parameters<PentagonMethods<T>["deleteMany"]>[0],
): ReturnType<PentagonMethods<T>["deleteMany"]> {
  const keys = schemaToKeys(tableDefinition.schema, queryArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);

  return await remove(kv, indexKeys);
}

// @todo(skoshx): refactor these using `whereToKeys` function
// like we refactored `findMany` and `findFirst`
async function updateImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: TableDefinition,
  updateArgs: Parameters<PentagonMethods<T>["update"]>[0],
): ReturnType<PentagonMethods<T>["update"]> {
  const keys = schemaToKeys(tableDefinition.schema, updateArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);

  if (indexKeys.length === 0) {
    const schemaItems = await listTable<
      z.infer<T["schema"]>
    >(kv, tableName);
    const foundItems = findItemsBySearch(
      schemaItems,
      updateArgs.where ?? {},
    );
    if (foundItems.length === 0) throw new Error();
    const updatedData = {
      ...foundItems[0].value,
      ...updateArgs.data,
    };

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

  return await update(kv, tableName, updatedData, indexKeys);
}

async function findManyImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: TableDefinition,
  queryArgs: Parameters<PentagonMethods<T>["findMany"]>[0],
): ReturnType<PentagonMethods<T>["findMany"]> {
  return await findMany(
    kv,
    tableName,
    tableDefinition,
    queryArgs as any,
  ) as any;
}

async function findFirstImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: TableDefinition,
  queryArgs: Parameters<PentagonMethods<T>["findFirst"]>[0],
): ReturnType<PentagonMethods<T>["findFirst"]> {
  return (await findMany(kv, tableName, tableDefinition, queryArgs as any))
    ?.[0] as any;
}
