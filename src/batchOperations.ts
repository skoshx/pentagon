import { PentagonBatchOpError } from "./errors.ts";
import { MutationOperation } from "./types.ts";

/**
 * There's a limit of 10 operations per transaction for now, so we
 * need to batch all operations.
 *
 * Reference: https://github.com/denoland/deno/issues/19284#issuecomment-1578919912
 */
const OPERATION_LIMIT = 10;

export async function batchOperations(
  kv: Deno.Kv,
  mutation: MutationOperation,
  keys: Deno.KvKey[],
) {
  const keyBatches: Deno.KvKey[][] = [];
  for (let i = 0; i < keys.length; i += OPERATION_LIMIT) {
    keyBatches.push(keys.slice(i, i + OPERATION_LIMIT));
  }

  // Commit batches
  for (let i = 0; i < keyBatches.length; i++) {
    let res = kv.atomic();
    for (const key of keyBatches[i]) {
      // @ts-expect-error
      res = res[mutation](key);
    }
    const commitResult = await res.commit();

    if (commitResult.ok === false) {
      throw new PentagonBatchOpError(
        `Could not perform batch mutation "${mutation}".`,
      );
    }
  }
}
