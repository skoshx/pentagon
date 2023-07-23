import { WithVersionstamp } from "./types.ts";
import { PentagonBatchOpError } from "./errors.ts";

/**
 * There's a limit of 10 operations per transaction for now, so we
 * need to batch all operations.
 *
 * Refer to: https://github.com/denoland/deno/issues/19284#issuecomment-1578919912
 */
const OPERATION_LIMIT = 10;

export async function withBatchedOperation<T>(
  kv: Deno.Kv,
  itemsToBatch: T[],
  fn: (res: Deno.AtomicOperation, item: T) => void,
  opName?: "create" | "update" | "delete" | "read",
) {
  const itemBatches: T[][] = [];
  const itemsWithVersionstamps: WithVersionstamp<T>[] = [];
  for (let i = 0; i < itemsToBatch.length; i += OPERATION_LIMIT) {
    itemBatches.push(itemsToBatch.slice(i, i + OPERATION_LIMIT));
  }

  for (let i = 0; i < itemBatches.length; i++) {
    const res = kv.atomic();
    for (const item of itemBatches[i]) {
      fn(res, item);
    }
    const commitResult = await res.commit();

    if (commitResult.ok === false) {
      throw new PentagonBatchOpError(
        `Could not perform batched ${opName ? opName + " " : " "}operation.`,
      );
    }

    // Add versionstamp to the batch
    for (let j = 0; j < itemBatches[i].length; j++) {
      const itemIndex = i * OPERATION_LIMIT + j;
      itemsWithVersionstamps.push({
        ...itemsToBatch[itemIndex],
        versionstamp: commitResult.versionstamp,
      });
    }
  }

  return itemsWithVersionstamps;
}
