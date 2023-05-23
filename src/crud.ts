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
  WithMaybeVersionstamp,
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
  const items = new Array<Deno.KvEntry<T>>();
  for await (const item of kv.list<T>({ prefix: [tableName] })) {
    items.push(item);
  }
  return items;
}

export async function newRead<T extends readonly unknown[]>(
  kv: Deno.Kv,
  keys: readonly [...{ [K in keyof T]: Deno.KvKey }],
  kvOptions?: KvOptions,
) {
  const res = await kv.getMany<T>(keys, kvOptions);
  return res;
}

export async function read<T extends Record<string, DatabaseValue>>(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
): Promise<WithMaybeVersionstamp<T> | undefined> {
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
  item: T,
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
      const keys = schemaToKeys(
        relationSchema,
        typeof relationValue === "boolean" && relationValue === true
          ? {}
          : relationValue as any,
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
          const entry = foundItems[i];
          let value: Partial<Record<typeof relationName, unknown[]>>;
          if (
            typeof entry.value !== "object" ||
            entry.value === null ||
            relationName in entry.value === false ||
            Array.isArray(
                (entry.value as Record<typeof relationName, unknown>)[
                  relationName
                ],
              ) === false
          ) {
            value = entry.value ??= {};
            value[relationName] = [];
          }

          // ensured that entry.value is of this type above
          value ??= entry.value as Record<typeof relationName, unknown[]>;

          if (typeof relationValue === "object") {
            // Partial include
            value![relationName]!.push(
              ...selectFromEntry(
                [relationFoundItems[i]],
                typeof relationValue === "boolean" && relationValue === true
                  ? {}
                  : relationValue,
              ).map((i) => i.value),
            );
          } else {
            value[relationName]!.push(
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
