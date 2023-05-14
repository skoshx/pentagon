import { PentagonResult, TableDefinition } from "./src/types.ts";

export function createPentagon<T extends Record<string, TableDefinition>>(
  schema: T,
) {
  const result: Partial<PentagonResult<T>> = {};

  // TODO: Run through schemas, validate `description`
  // TODO: add all properties
  for (const [key, value] of Object.entries(schema)) {
    console.log("Adding values to ", key, value);
  }
  return result as PentagonResult<T>;
}
