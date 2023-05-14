import { PentagonResult, TableDefinition } from "./types.ts";

export function createPentagon<T extends Record<string, TableDefinition>>(
  kv: Deno.Kv,
  schema: T,
) {
  const result: Partial<PentagonResult<T>> = {};

  // TODO: Run through schemas, validate `description`
  // TODO: Run through schemas, validate `relations` like Prisma
  // TODO: add all properties
  for (const [key, value] of Object.entries(schema)) {
    /* // @ts-ignore
    result[key as keyof T] = {
      findFirst: (fetchOpts) => {},
      findFirstOrThrow: (fetchOpts) => {},
      findMany: (fetchOpts) => {},
      // findUnique:
      create: async (createOrUpdate) => {
        // return create<T[typeof key]['schema']>(kv, key, )
      },
      update: (createOrUpdate) => {
      },
      delete: (deleteArgs) => {},
    };*/
  }
  return result as PentagonResult<T>;
}
