import { create, findMany, remove, update } from "./crud.ts";
import { PentagonUpdateError } from "./errors.ts";
import { keysToIndexes, schemaToKeys, whereToKeys } from "./keys.ts";
import type {
  CreateAndUpdateResponse,
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
        create: (createArgs) =>
          createImpl(kv, tableName, tableDefinition, createArgs),
        createMany: (createManyArgs) =>
          createManyImpl(kv, tableName, tableDefinition, createManyArgs),
        delete: (queryArgs) =>
          // @ts-ignore
          deleteImpl(kv, tableName, tableDefinition, queryArgs),
        deleteMany: (queryArgs) =>
          // @ts-ignore
          deleteManyImpl(kv, tableName, tableDefinition, queryArgs),
        update: (queryArgs) =>
          updateImpl(kv, tableName, tableDefinition, queryArgs),
        updateMany: (queryArgs) =>
          updateManyImpl(kv, tableName, tableDefinition, queryArgs),
        findMany: (queryArgs) =>
          // @ts-ignore
          findManyImpl(kv, tableName, tableDefinition, queryArgs),
        findFirst: (queryArgs) =>
          // @ts-ignore
          findFirstImpl(kv, tableName, tableDefinition, queryArgs),
      };

      return [tableName, methods];
    }),
  );
  // @ts-ignore: todo: add this without losing the inferred types
  result.getKv = () => kv;

  return result as PentagonResult<T>;
}

export function getKvInstance<T>(db: T): Deno.Kv {
  // @ts-ignore: same as above
  return db.getKv();
}

async function createImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  createArgs: Parameters<PentagonMethods<T>["create"]>[0],
): ReturnType<PentagonMethods<T>["create"]> {
  const keys = schemaToKeys(tableDefinition.schema, createArgs.data);
  const indexKeys = keysToIndexes(tableName, keys);

  return await create(kv, createArgs.data, indexKeys);
}

async function createManyImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  createManyArgs: Parameters<PentagonMethods<T>["createMany"]>[0],
) {
  // TODO: this should be in one "atomic" operation, this is not good
  const createdItems: CreateAndUpdateResponse<T>[] = [];
  for (let i = 0; i < createManyArgs.data.length; i++) {
    const createArgs: Parameters<PentagonMethods<T>["create"]>[0] = {
      select: createManyArgs.select,
      data: createManyArgs.data[i],
    };

    createdItems.push(
      await createImpl(kv, tableName, tableDefinition, createArgs),
    );
  }
  return createdItems;
}

async function deleteImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  queryArgs: Parameters<PentagonMethods<T>["delete"]>[0],
) {
  const keys = schemaToKeys(tableDefinition.schema, queryArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);
  const foundItems = await whereToKeys(
    kv,
    tableName,
    indexKeys,
    queryArgs.where ?? {},
  );
  // @ts-ignore TODO: delete should not use QueryArgs or QueryResponse
  return await remove(kv, foundItems.map((i) => i.key));
}

async function deleteManyImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  queryArgs: Parameters<PentagonMethods<T>["deleteMany"]>[0],
) {
  const keys = schemaToKeys(tableDefinition.schema, queryArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);
  const foundItems = await whereToKeys(
    kv,
    tableName,
    indexKeys,
    queryArgs.where ?? {},
  );
  // @ts-ignore TODO: deleteMany should not use QueryArgs or QueryResponse
  return await remove(kv, foundItems.map((i) => i.key));
}

async function updateManyImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  updateArgs: Parameters<PentagonMethods<T>["updateMany"]>[0],
): ReturnType<PentagonMethods<T>["updateMany"]> {
  const keys = schemaToKeys(tableDefinition.schema, updateArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);
  const foundItems = await whereToKeys(
    kv,
    tableName,
    indexKeys,
    updateArgs.where ?? {},
  );

  if (foundItems.length === 0) {
    // @todo: should we throw?
    throw new PentagonUpdateError(`Updating zero elements.`);
  }

  try {
    const updatedItems = foundItems
      .map((existingItem) => ({
        key: existingItem.key,
        value: tableDefinition.schema.parse({
          ...existingItem.value,
          ...updateArgs.data,
        }),
        versionstamp: updateArgs.data.versionstamp ?? existingItem.versionstamp,
      }));

    return await update(
      kv,
      updatedItems,
    );
  } catch {
    throw new PentagonUpdateError(`An error occurred while updating items`);
  }
}

async function updateImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  updateArgs: Parameters<PentagonMethods<T>["update"]>[0],
): ReturnType<PentagonMethods<T>["update"]> {
  return (await updateManyImpl(kv, tableName, tableDefinition, updateArgs))
    ?.[0];
}

async function findManyImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  queryArgs: Parameters<PentagonMethods<T>["findMany"]>[0],
) {
  return await findMany(
    kv,
    tableName,
    tableDefinition,
    queryArgs,
  ) as Awaited<ReturnType<PentagonMethods<T>["findMany"]>>;
}

async function findFirstImpl<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  queryArgs: Parameters<PentagonMethods<T>["findFirst"]>[0],
) {
  return (await findMany(kv, tableName, tableDefinition, queryArgs))
    ?.[0] as Awaited<ReturnType<PentagonMethods<T>["findFirst"]>>;
}
