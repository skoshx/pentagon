import { z } from "../deps.ts";
import { createPentagon } from "../src/pentagon.ts";
import { CreatedOrUpdatedItem } from "../src/types.ts";

export const User = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
});

export const Order = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
  userId: z.string().uuid(),
});

export function removeVersionstamp<T>(item: CreatedOrUpdatedItem<T>): T {
  const { versionstamp: _versionstamp, ...rest } = item;
  return rest as T;
}

export const kv = await Deno.openKv();

export function createMockDatabase() {
  return createPentagon(kv, {
    users: {
      schema: User,
      relations: {
        myOrders: ["orders", Order, undefined, "userId"],
      },
    },
    orders: {
      schema: Order,
      relations: {
        user: ["users", User, "userId", "id"],
      },
    },
  });
}

export async function populateMockDatabase(
  db: Awaited<ReturnType<typeof createMockDatabase>>,
) {
  await db.users.create({
    data: {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
    },
  });

  await db.orders.create({
    data: {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "Cheeseburger",
    },
  });
}

export async function dumpUsers() {
  const kv = await Deno.openKv();
  for await (const x of kv.list({ prefix: ["users"] })) {
    console.log("User: ");
    console.log(x);
  }
  await kv.close();
}

export async function clearMocks(
  db: Awaited<ReturnType<typeof createMockDatabase>>,
) {
  const kv = await Deno.openKv();
  for await (const x of kv.list({ prefix: ["users"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["orders"] })) {
    await kv.delete(x.key);
  }
  await kv.close();
  // await
  // await db.close()
  // await db.users.deleteMany({});
}
