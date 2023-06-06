import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
  removeVersionstamp,
} from "./util.ts";

Deno.test("include", async (t) => {
  const db = await createMockDatabase();
  await populateMockDatabase(db);

  await t.step("include > whole object", async () => {
    const userWithOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: true,
      },
    });

    assertEquals(removeVersionstamp(userWithOrders), {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
      // @ts-expect-error
      myOrders: [{
        id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
        createdAt: new Date(0),
        userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
        name: "Cheeseburger",
      }],
    });
  });

  await t.step("include > specific items", async () => {
    const userWithPartialOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: {
          name: true,
        },
      },
    });

    // @todo: this shouldn't give TS errors
    // @ts-expect-error
    const myOrders = userWithPartialOrders.myOrders;

    assertEquals(removeVersionstamp(userWithPartialOrders), {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
      // @ts-expect-error
      myOrders: [{
        name: "Cheeseburger",
      }],
    });
  });

  await clearMocks(db);
});
