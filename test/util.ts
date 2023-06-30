import { z } from "../deps.ts";
import { createPentagon } from "../src/pentagon.ts";

export const User = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
});

export const Order = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
  userId: z.string().uuid(),
});

export const Post = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  title: z.string(),
});

export const Category = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
});

export function removeVersionstamps<T = unknown>(items: Deno.KvEntry<T>[]) {
  return items.map((item) => {
    const { versionstamp: _versionstamp, ...rest } = item;
    return rest;
  });
}

export function removeVersionstamp<
  T extends { versionstamp?: string | null | undefined },
>(
  item: T,
): Omit<T, "versionstamp"> {
  const { versionstamp: _versionstamp, ...rest } = item;
  return rest;
}

export const kv = await Deno.openKv();

/*

export const Post = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  title: z.string(),
})

export const Category = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
})

*/

export function createMockDatabase() {
  return createPentagon(kv, {
    users: {
      schema: User,
      relations: {
        myOrders: ["orders", [Order], "id", "userId"],
      },
    },
    orders: {
      schema: Order,
      relations: {
        user: ["users", User, "userId", "id"],
      },
    },
    /* posts: {
      schema: Post,
      relations: {
        categories: ["categories", [Category], undefined, undefined]
      }
    },
    categories: {
      schema: Category,
      relations: {
        posts: ["posts", [Post], undefined, undefined]
      }
    } */
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

export async function clearMocks() {
  for await (const x of kv.list({ prefix: ["users"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["orders"] })) {
    await kv.delete(x.key);
  }
}
