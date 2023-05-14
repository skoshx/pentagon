import { z } from "../deps.ts";
import { createPentagon } from "../src/pentagon.ts";

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

export async function createMockDatabase() {
  const kv = await Deno.openKv();
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

export async function clearMocks(
  db: Awaited<ReturnType<typeof createMockDatabase>>,
) {
  await db.users.delete({
    where: { id: "67218087-d9a8-4a57-b058-adc01f179ff9" },
  });
}
