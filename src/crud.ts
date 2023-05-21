// CRUD operations
import { PentagonCreateItemError, PentagonDeleteItemError } from "./errors.ts";
import { DatabaseValue, KvOptions, WithVersionstamp } from "./types.ts";

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
  // for (let i )
  // @ts-ignore
  const res = await kv.getMany<T>(keys, kvOptions);
  return res;
}

export async function read<T extends Record<string, DatabaseValue>>(
  kv: Deno.Kv,
  keys: Deno.KvKey[],
): Promise<WithVersionstamp<T>> {
  for (let i = 0; i < keys.length; i++) {
    const res = await kv.get<T>(keys[i]);
    if (res.value) {
      return {
        ...res.value,
        versionstamp: res.versionstamp,
      };
    }
  }
  throw new Error(`Could not find anything TODO  fix this error`);
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
