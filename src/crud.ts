// CRUD operations
import { PentagonCreateItemError, PentagonDeleteItemError } from "./errors.ts";
import {
  keysToIndexes,
  schemaToKeys,
  selectFromEntry,
  whereToKeys,
} from "./keys.ts";
import { getRelationSchema, isToManyRelation } from "./relation.ts";
import {
  DatabaseValue,
  KvOptions,
  QueryArgs,
  TableDefinition,
  WithVersionstamp,
} from "./types.ts";

function chainAccessKeyCheck(
  op: Deno.AtomicOperation,
  key: Deno.KvKey,
  versionstamp: string | null = null,
) {
  return op.check({ key: key, versionstamp });
}

function chainSet<T>(op: Deno.AtomicOperation, key: Deno.KvKey, item: T) {
  return op.set(key, item);
}

function chainDelete<T>(op: Deno.AtomicOperation, key: Deno.KvKey) {
  return op.delete(key);
}

export async function listTable<T>(kv: Deno.Kv, tableName: string) {
  const items: Deno.KvEntry<T>[] = [];
  for await (const item of kv.list<T>({ prefix: [tableName] })) {
    items.push(item);
  }
  return items;
}

export async function newRead<T extends readonly unknown[]>(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
  kvOptions?: KvOptions,
) {
  // @ts-ignore
  const res = await kv.getMany<T>(keys, kvOptions);
  return res;
}

export async function read<T extends Record<string, DatabaseValue>>(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
): Promise<WithVersionstamp<T> | undefined> {
  for (let i = 0; i < keys.length; i++) {
    const res = await kv.get<T>(keys[i]);
    if (res.value) {
      return {
        ...res.value,
        versionstamp: res.versionstamp,
      };
    }
  }
}

export async function remove(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
): Promise<WithVersionstamp<Record<string, DatabaseValue>>> {
  let res = kv.atomic();

  for (let i = 0; i < keys.length; i++) {
    res = chainAccessKeyCheck(res, keys[i], null);
  }

  for (let i = 0; i < keys.length; i++) {
    res = chainDelete(res, keys[i]);
  }

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return {
      versionstamp: commitResult.versionstamp,
    };
  }
  throw new PentagonDeleteItemError(`Could not delete item.`);
}

export async function update<T extends Record<string, DatabaseValue>>(
  kv: Deno.Kv,
  tableName: string,
  item: T | WithVersionstamp<T>,
  keys: Deno.KvKey[],
): Promise<WithVersionstamp<T>> {
  let res = kv.atomic();

  // Checks
  for (let i = 0; i < keys.length; i++) {
    res = chainAccessKeyCheck(
      res,
      keys[i],
      (item.versionstamp as string) ?? null,
    );
  }

  // Sets
  for (let i = 0; i < keys.length; i++) {
    res = chainSet(res, keys[i], item);
  }

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return {
      ...item,
      versionstamp: commitResult.versionstamp,
    };
  }
  throw new PentagonCreateItemError(`Could not update item.`);
}

export async function create<T extends Record<string, DatabaseValue>>(
  kv: Deno.Kv,
  tableName: string,
  item: T,
  keys: Deno.KvKey[],
): Promise<WithVersionstamp<T>> {
  let res = kv.atomic();

  // Checks
  for (let i = 0; i < keys.length; i++) {
    res = chainAccessKeyCheck(res, keys[i]);
  }

  // Sets
  for (let i = 0; i < keys.length; i++) {
    res = chainSet(res, keys[i], item);
  }

  const commitResult = await res.commit();

  if (commitResult.ok) {
    return {
      ...item,
      versionstamp: commitResult.versionstamp,
    };
  }
  throw new PentagonCreateItemError(`Could not create item.`);
}

// findMany, deleteMany, updateMany, etc

export async function findMany<T extends TableDefinition>(
  kv: Deno.Kv,
  tableName: string,
  tableDefinition: T,
  queryArgs: QueryArgs<T>,
) {
  const keys = schemaToKeys(tableDefinition.schema, queryArgs.where ?? []);
  const indexKeys = keysToIndexes(tableName, keys);
  const foundItems = await whereToKeys(
    kv,
    tableName,
    indexKeys,
    queryArgs.where ?? {},
  );

  // Include

  if (queryArgs.include) {
    for (
      const [relationName, relationValue] of Object.entries(queryArgs.include)
    ) {
      // Relation name
      const relationDefinition = tableDefinition.relations?.[relationName];
      if (!relationDefinition) {
        throw new Error(
          `No relation found for relation name "${relationName}", make sure it's ∂efined in your Pentagon configuration.`,
        );
      }

      const relationSchema = getRelationSchema(relationDefinition);
      // @ts-ignore
      const keys = schemaToKeys(
        relationSchema,
        // @ts-ignore
        relationValue === true ? {} : relationValue,
      );
      const indexKeys = keysToIndexes(relationDefinition[0], keys);

      const relationFoundItems = await whereToKeys(
        kv,
        relationDefinition[0],
        indexKeys,
        {},
      );

      for (let i = 0; i < foundItems.length; i++) {
        if (isToManyRelation(relationDefinition)) {
          // @ts-ignore
          if (!foundItems[i].value[relationName]) {
            // @ts-ignore
            foundItems[i].value[relationName] = [];
          }

          if (typeof relationValue === "object") {
            // Partial include
            // @ts-ignore:
            foundItems[i].value[relationName].push(
              ...selectFromEntry(
                [relationFoundItems[i]],
                // @ts-ignore
                relationValue === true ? {} : relationValue,
              ).map((i) => i.value),
            );
          } else {
            // @ts-ignore
            foundItems[i].value[relationName].push(
              relationFoundItems[i].value,
            );
          }
        } else {
          // @ts-ignore: bad at types
          foundItems[i].value[relationName] = relationFoundItems[i].value;
        }
      }
    }
  }

  // Select
  const selectedItems = queryArgs.select
    ? selectFromEntry(foundItems, queryArgs.select)
    : foundItems;

  return selectedItems.map((item) => item.value);
}
