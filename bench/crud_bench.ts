import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
} from "../test/util.ts";

const db = await createMockDatabase();
await clearMocks();
await populateMockDatabase(db);

const mockUser = {
  id: "07c2c2bc-0513-4fe5-8b4a-70e8f73cdde6",
  createdAt: new Date(1337),
  name: "John Doee",
};

const createMockItem = () => ({
  id: crypto.randomUUID(),
  createdAt: new Date(),
  name: "Double Cheeseburger",
  userId: mockUser.id,
});

// A lot of double cheeseburgers
async function createManyOrders() {
  const orders = [...new Array(10_000).keys()].map(() => createMockItem());
  for (let i = 0; i < orders.length; i++) {
    await db.orders.create({
      data: orders[i],
    });
  }
  console.log(`🍔 Created ${orders.length} mock double cheeseburger orders.`);
}

await createManyOrders();

Deno.bench("findFirst > where", async () => {
  await db.users.findFirst({
    where: {
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
    },
  });
});

Deno.bench("findMany", async () => {
  await db.users.findMany({});
});

Deno.bench("findMany > where", async () => {
  await db.users.findMany({
    where: {
      name: "Double Cheeseburger",
    },
  });
});
