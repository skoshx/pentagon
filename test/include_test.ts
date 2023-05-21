import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
  removeVersionstamp,
} from "./util.ts";

Deno.test("include", async (t) => {
  const db = await createMockDatabase();
  await populateMockDatabase(db);

  // One-to-one
  /* relations: {
    myProfile: ["users", User, "userId", "id"],
  }, */

  // One-to-many
  /*relations: {
    myOrders: ["orders", [Order], undefined, "userId"],
  },
  Corresponding in orders
  relations: {
    user: ["users", User, userId, id]
  }

  */
  // Many-to-many
  // Nomoti -> implement later
  /*

  Include works like:

  Use schema to get `keys`, build indexes

  If no indexes are found,
  - list all, then sort by search

  @todo(skoshx): write function that takes care of all of the above

  How does this work for update? Like following:

  1. use schema to get `keys`
  2. build indexes
  3.1 if indexes found
    - read using them
    - sort using `where`
    - UPDATE using keys found
    - (ADD SELECT)

  3.2 if no indexes found
    - list all items from "table"
    - sort keys using `where`
    - UPDATE using keys found


  */

  // await t

  await t.step("include > whole object", async () => {
    const userWithOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: true,
      },
    });

    assertEquals(userWithOrders, {
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
