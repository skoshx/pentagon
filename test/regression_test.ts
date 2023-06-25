import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { clearMocks, createMockDatabase, removeVersionstamp } from "./util.ts";

Deno.test("include", async (t) => {
  const db = await createMockDatabase();

  await t.step("regression #8", async () => {
    // Create user without creating orders
    await db.users.create({
      data: {
        createdAt: new Date(0),
        id: "f407a8f8-9392-4922-b8bf-31a9ed2cbc41",
        name: "Rick Regression",
      },
    });

    const userWithEmptyOrders = await db.users.findFirst({
      where: { id: "f407a8f8-9392-4922-b8bf-31a9ed2cbc41" },
      include: { myOrders: true },
    });

    // console
    assertEquals(removeVersionstamp(userWithEmptyOrders), {
      createdAt: new Date(0),
      id: "f407a8f8-9392-4922-b8bf-31a9ed2cbc41",
      name: "Rick Regression",
      myOrders: [],
    });
  });

  await t.step("regression #11", async () => {
    await db.agreedTerms.create({
      data: {
        id: 123,
        createdAt: new Date(0),
        updatedAt: null,
      },
    });

    const result = await db.agreedTerms.findFirst({
      where: {
        id: 123,
      },
      select: {
        id: true,
      },
    });

    assertEquals(removeVersionstamp(result), {
      id: 123,
    });
  });

  clearMocks();
});
