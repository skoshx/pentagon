// CRUD operations
import { z } from "../deps.ts";
import { PentagonCreateItemError, PentagonDeleteItemError } from "./errors.ts";
import { keysToItems, schemaToKeys, selectFromEntries } from "./keys.ts";
import { isToManyRelation } from "./relation.ts";
import {
  CreateArgs,
  CreateManyArgs,
  DatabaseValue,
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
): Promise<WithVersionstamp<Record<string, DatabaseValue>>> {
  let res = kv.atomic();

  // @todo: do we need these checks here for delete ops?
  /* for (let i = 0; i < keys.length; i++) {
    res = chainAccessKeyCheck(res, keys[i], null);
  } */

  for (const key of keys) {
    res = res.delete(key);
  }

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return {
      versionstamp: commitResult.versionstamp,
    };
  }
  throw new PentagonDeleteItemError(`Could not delete item.`);
}

export async function update<
  T extends TableDefinition,
  Item extends z.output<T["schema"]>,
>(
  kv: Deno.Kv,
  entries: Deno.KvEntry<Item>[],
): Promise<WithVersionstamp<Item>[]> {
  let res = kv.atomic();

  // Checks
  for (const entry of entries) {
    res = res.check(entry);
  }

  // Sets
  for (const { value, key } of entries) {
    res = res.set(key, value);
  }

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return entries.map(({ value }) => ({
      ...value,
      versionstamp: commitResult.versionstamp,
    }));
  }

  throw new PentagonCreateItemError(`Could not update item.`);
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
  const res = kv.atomic();
  const keys = schemaToKeys(tableName, tableDefinition.schema, createArgs.data);
  const item: z.output<T["schema"]> = tableDefinition.schema.parse(
    createArgs.data,
  );

  createOne(res, item, keys);

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return {
      ...item,
      versionstamp: commitResult.versionstamp,
    };
  }

  throw new PentagonCreateItemError(`Could not create item.`);
}

export async function createMany<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  createManyArgs: CreateManyArgs<T>,
): Promise<WithVersionstamp<z.output<T["schema"]>>[]> {
  const res = kv.atomic();
  const items: z.output<T["schema"]>[] = [];

  for (const data of createManyArgs.data) {
    const keys = schemaToKeys(tableName, tableDefinition.schema, data);
    const item: z.output<T["schema"]> = tableDefinition.schema.parse(data);

    createOne(res, item, keys);

    items.push(item);
  }

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return items.map((item) => ({
      ...item,
      versionstamp: commitResult.versionstamp,
    }));
  }

  throw new PentagonCreateItemError(`Could not create items.`);
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
  const foundItems = await keysToItems(
    kv,
    tableName,
    keys.length > 0 ? [keys[0]] : [],
    queryArgs.where ?? {},
  );

  if (queryArgs.include) {
    for (
      const [relationName, relationValue] of Object.entries(queryArgs.include)
    ) {
      // Relation name
      const relationDefinition = tableDefinition.relations?.[relationName];
      if (!relationDefinition) {
        throw new Error(
          `No relation found for relation name "${relationName}", make sure it's defined in your Pentagon configuration.`,
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
