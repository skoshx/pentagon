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

  await t.step("include > one to one > target (one)", async () => {
    // @todo(skoshx): write test
  });
  await t.step("include > one to one > target (second one)", async () => {
    // @todo(skoshx): write test
  });

  await t.step("include > one to many > target (one)", async () => {
    const userWithOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: true,
      },
    });

    assertEquals({
      ...removeVersionstamp(userWithOrders),
      // @ts-expect-error
      myOrders: [removeVersionstamp(userWithOrders.myOrders[0])],
    }, {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
      myOrders: [{
        id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
        createdAt: new Date(0),
        userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
        name: "Cheeseburger",
      }],
    });
  });

  await t.step("include > one to many > source (many)", async () => {
    const orderWithUser = await db.orders.findFirst({
      where: { name: "Cheeseburger" },
      include: {
        user: true,
      },
    });

    assertEquals({
      ...removeVersionstamp(orderWithUser),
      // @ts-expect-error
      user: removeVersionstamp(orderWithUser.user),
    }, {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "Cheeseburger",
      user: {
        id: "67218087-d9a8-4a57-b058-adc01f179ff9",
        createdAt: new Date(0),
        name: "John Doe",
      },
    });
  });

  await t.step("include > many to many > target (many)", async () => {
    // @todo(skoshx): implement (implicit?) many to many relations
  });

  await t.step("include > many to many > source (many)", async () => {
    // @todo(skoshx): implement (implicit?) many to many relations
  });

  await t.step("include > select", async () => {
    const userWithPartialOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: {
          name: true,
          createdAt: true,
        },
      },
    });

    assertEquals({
      ...removeVersionstamp(userWithPartialOrders),
      // @ts-expect-error
      myOrders: [removeVersionstamp(userWithPartialOrders.myOrders[0])],
    }, {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
      myOrders: [{
        name: "Cheeseburger",
        createdAt: new Date(0),
      }],
    });
  });

  await clearMocks();
});
