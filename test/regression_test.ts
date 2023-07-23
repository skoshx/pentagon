import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { clearMocks, createMockDatabase, User } from "./util.ts";
import { removeVersionstamp } from "../src/util.ts";
import { createPentagon } from "../mod.ts";
import { z } from "../deps.ts";
import { schemaToKeys } from "../src/keys.ts";

Deno.test("include", async (t) => {
  const db = createMockDatabase();

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

    // @ts-ignore: currently failing because include type seems to be incorrect,
    // it fails because it expects the property myPosts to exist even though
    // it is not included.
    assertEquals(removeVersionstamp(userWithEmptyOrders), {
      createdAt: new Date(0),
      id: "f407a8f8-9392-4922-b8bf-31a9ed2cbc41",
      name: "Rick Regression",
      myOrders: [],
    });
  });

  await clearMocks();
});

Deno.test("regression #26", async (t) => {
  const kv = await Deno.openKv();
  await clearMocks();

  const User = z.object({
    // note: the below is redundant, we can only have max one index
    // and primary is already a unique index.
    // id: z.number().describe("primary, unique"),
    id: z.number().describe("primary"),
    firstName: z.string(),
    lastName: z.string().optional(),
    nickname: z.string().describe("unique"),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  });
  type UserType = z.infer<typeof User>;

  const db = createPentagon(kv, {
    users: {
      schema: User,
    },
  });

  const mockUser: UserType = {
    id: 0,
    firstName: "Rick",
    lastName: "Regression #26",
    nickname: "rickregression26",
    createdAt: new Date(1337),
    updatedAt: null,
  };

  const updatedDate = new Date();

  await t.step("deleteMany", async () => {
    await db.users.deleteMany({});

    for await (const _x of kv.list({ prefix: ["users"] })) {
      throw new Error(
        `Regression #26 failed. There should exist no 'users' after deleting all entries.`,
      );
    }
  });

  await t.step("create", async () => {
    const createdMockUser = await db.users.create({
      data: mockUser,
    });
    assertEquals(removeVersionstamp(createdMockUser), mockUser);
  });

  await t.step("read", async () => {
    const createdMockUser = await db.users.findFirst({
      where: {
        nickname: mockUser.nickname,
      },
    });
    assertEquals(removeVersionstamp(createdMockUser), mockUser);
  });

  await t.step("update", async () => {
    const updatedMockUser = await db.users.update({
      where: {
        id: 0,
      },
      data: {
        firstName: "Rick Roll",
        updatedAt: updatedDate,
      },
    });

    assertEquals(removeVersionstamp(updatedMockUser), {
      ...mockUser,
      firstName: "Rick Roll",
      updatedAt: updatedDate,
    });
  });

  await t.step("read updated user", async () => {
    const updatedMockUser = await db.users.findFirst({
      where: {
        id: 0,
      },
    });
    assertEquals(removeVersionstamp(updatedMockUser), {
      ...mockUser,
      firstName: "Rick Roll",
      updatedAt: updatedDate,
    });
  });

  await db.users.deleteMany({});
  await clearMocks();
  kv.close();
});

Deno.test("regression #26 (correct keys)", () => {
  const User = z.object({
    // note: primary key is always unique, so `unique` is redundant
    // id: z.number().describe("primary, unique"),
    id: z.number().describe("primary"),
    firstName: z.string(),
    lastName: z.string().optional(),
    nickname: z.string().describe("unique"),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  });
  type UserType = z.infer<typeof User>;
  const mockUser: UserType = {
    id: 0,
    firstName: "Rick",
    lastName: "Regression #26",
    nickname: "rickregression26",
    createdAt: new Date(1337),
    updatedAt: null,
  };

  const keys = schemaToKeys("users", User, mockUser);
  assertEquals(keys, [
    // primary key
    {
      accessKey: {
        type: "primary",
        value: mockUser.id,
      },
      denoKey: ["users", mockUser.id],
    },
    // unique
    {
      accessKey: {
        type: "unique",
        value: mockUser.nickname,
        suffix: "_by_unique_nickname",
      },
      denoKey: ["users_by_unique_nickname", mockUser.nickname],
    },
  ]);
});

Deno.test("regression #28", async () => {
  const db = createMockDatabase();
  await clearMocks();

  // create 100 users
  for (let i = 0; i < 100; i++) {
    await db.users.create({
      data: {
        createdAt: new Date(0),
        id: crypto.randomUUID(),
        name: `User ${i}`,
      },
    });
  }

  // Delete many users
  const deletedUsers = await db.users.deleteMany({});
  console.log(deletedUsers);
});

Deno.test("regression #30", async () => {
  const kv = await Deno.openKv();

  const UserSchemaWithDefaultId = User.extend({
    id: z.string().uuid().describe("primary").default(() =>
      crypto.randomUUID()
    ),
  });

  const db = createPentagon(kv, {
    users: {
      schema: UserSchemaWithDefaultId,
    },
  });

  await db.users.deleteMany({});
  await db.users.create({
    data: {
      createdAt: new Date(0),
      name: "John Doe",
    },
  });

  const fetchedUsers = await db.users.findMany({});
  assert(fetchedUsers.length === 1);
  assertEquals(fetchedUsers[0].createdAt, new Date(0));
  assertEquals(fetchedUsers[0].name, "John Doe");
  kv.close();
});
