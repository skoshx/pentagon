// CRUD operations
import { z } from "../deps.ts";
import { withBatchedOperation } from "./batchOperations.ts";
import {
  getIndexPrefixes,
  keysToItems,
  schemaToKeys,
  selectFromEntries,
} from "./keys.ts";
import { isToManyRelation } from "./relation.ts";
import {
  CreateArgs,
  CreateManyArgs,
  PentagonKey,
  QueryArgs,
  QueryKvOptions,
  TableDefinition,
  WithMaybeVersionstamp,
  WithVersionstamp,
} from "./types.ts";
import { mergeValueAndVersionstamp } from "./util.ts";

export async function listTable<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
) {
  const items: Deno.KvEntry<z.output<T["schema"]>>[] = [];

  for await (
    const item of kv.list<z.output<T["schema"]>>({ prefix: [tableName] })
  ) {
    items.push(item);
  }

  return items;
}

export async function listTableWithIndexPrefixes<T extends TableDefinition>(
  kv: Deno.Kv,
  ...prefixes: Deno.KvKeyPart[]
) {
  const items: Deno.KvEntry<z.output<T["schema"]>>[] = [];

  for (let i = 0; i < prefixes.length; i++) {
    for await (
      const item of kv.list<z.output<T["schema"]>>({ prefix: [prefixes[i]] })
    ) {
      items.push(item);
    }
  }

  return items;
}

export async function read<T extends TableDefinition>(
  kv: Deno.Kv,
  keys: PentagonKey[],
  kvOptions?: QueryKvOptions,
) {
  return await kv.getMany<z.output<T["schema"]>[]>(
    keys.map(({ denoKey }) => denoKey),
    kvOptions,
  );
}

export async function remove(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
) {
  await withBatchedOperation(kv, keys, (res, key) => {
    res.delete(key);
  }, "delete");
}

export async function update<
  T extends TableDefinition,
  Item extends z.output<T["schema"]>,
>(
  kv: Deno.Kv,
  entries: Deno.KvEntry<Item>[],
): Promise<WithVersionstamp<Item>[]> {
  const entriesWithVersionstamps = await withBatchedOperation(
    kv,
    entries,
    (res, entry) => {
      res.check(entry);
      res.set(entry.key, entry.value);
    },
    "update",
  );

  return entriesWithVersionstamps.map(({ value, versionstamp }) => ({
    ...value,
    versionstamp,
  }));
}

function createOne<T extends TableDefinition>(
  res: Deno.AtomicOperation,
  item: z.output<T["schema"]>,
  keys: PentagonKey[],
) {
  for (const { accessKey, denoKey } of keys) {
    switch (accessKey.type) {
      case "primary":
      case "unique":
        res = res.check({ key: denoKey, versionstamp: null });
        /* falls through */
      case "index":
        res = res.set(denoKey, item);
        break;
      default:
        throw new Error(`Unknown index key ${denoKey}`);
    }
  }
}

export async function create<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  createArgs: CreateArgs<T>,
): Promise<WithVersionstamp<z.output<T["schema"]>>> {
  return (await createMany(kv, tableName, tableDefinition, {
    data: [createArgs.data],
  }))?.[0];
}

export async function createMany<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  createManyArgs: CreateManyArgs<T>,
): Promise<WithVersionstamp<z.output<T["schema"]>>[]> {
  const createdItemsWithVersionstamps = await withBatchedOperation(
    kv,
    createManyArgs.data,
    (res, data) => {
      const parsedData: z.output<T["schema"]> = tableDefinition.schema.parse(
        data,
      );
      const keys = schemaToKeys(tableName, tableDefinition.schema, parsedData);
      createOne(res, parsedData, keys);
      return parsedData;
    },
    "create",
  );

  return createdItemsWithVersionstamps;
}

export async function findMany<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  queryArgs: QueryArgs<T>,
) {
  const keys = schemaToKeys(
    tableName,
    tableDefinition.schema,
    queryArgs.where ?? [],
  );
  const indexPrefixes = getIndexPrefixes(tableName, tableDefinition.schema);
  const foundItems = await keysToItems(
    kv,
    tableName,
    keys.length > 0 ? [keys[0]] : [],
    queryArgs.where ?? {},
    indexPrefixes.length > 0 ? [indexPrefixes[0]] : [],
  );

  if (queryArgs.include) {
    for (
      const [relationName, relationValue] of Object.entries(queryArgs.include)
    ) {
      // Relation name
      const relationDefinition = tableDefinition.relations?.[relationName];
      if (!relationDefinition) {
        throw new Error(
          `No relation found for relation name '${relationName}', make sure it's defined in your Pentagon configuration.`,
        );
      }
      const tableName = relationDefinition[0];
      const localKey = relationDefinition[2];
      const foreignKey = relationDefinition[3];

      for (let i = 0; i < foundItems.length; i++) {
        const foundRelationItems = await findMany(
          kv,
          tableName,
          tableDefinition,
          {
            select: relationValue === true ? undefined : relationValue,
            where: {
              [foreignKey]: foundItems[i].value[localKey],
            } as Partial<WithMaybeVersionstamp<z.infer<T["schema"]>>>,
          },
        );

        // Add included relation value
        foundItems[i].value[relationName] = isToManyRelation(relationDefinition)
          ? foundRelationItems
          : foundRelationItems?.[0];
      }
    }
  }

  // Select
  const selectedItems = queryArgs.select
    ? selectFromEntries(foundItems, queryArgs.select)
    : foundItems;

  return selectedItems.map((item) => mergeValueAndVersionstamp(item));
}
