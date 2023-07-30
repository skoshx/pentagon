import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
  User,
} from "./util.ts";
import { z } from "../deps.ts";
import { getKvInstance } from "../mod.ts";
import { removeVersionstamp } from "../src/util.ts";

Deno.test("Create / Read / Update / Remove", async (t) => {
  const db = await createMockDatabase();
  await clearMocks();
  await populateMockDatabase(db);

  const mockUsers: z.infer<typeof User>[] = [...new Array(5).keys()].map((
    i,
  ) => ({
    id: crypto.randomUUID(),
    createdAt: new Date(1337),
    name: `User ${i}`,
  }));

  await t.step("create", async () => {
    const createdUser = await db.users.create({
      data: mockUsers[0],
    });

    const fetchedUser = await db.users.findFirst({
      where: { id: mockUsers[0].id },
    });

    assertEquals(removeVersionstamp(fetchedUser), mockUsers[0]);
    assertEquals(removeVersionstamp(createdUser), mockUsers[0]);
  });

  await t.step("delete", async () => {
    await db.users.delete({
      where: { id: mockUsers[0].id },
    });

    const nonexistentUser = await db.users.findFirst({
      where: { id: mockUsers[0].id },
    });

    for await (const res of getKvInstance(db).list({ prefix: ["users"] })) {
      assert((res.value as z.infer<typeof User>).id !== mockUsers[0].id);
    }
    assertEquals(nonexistentUser, undefined);
  });

  await t.step("createMany", async () => {
    const createdUsers = await db.users.createMany({
      data: mockUsers,
    });

    const fetchedUsers = await db.users.findMany({});
    assert(
      mockUsers.every((u) =>
        fetchedUsers.find((fetchedUser) => fetchedUser.id === u.id)
      ),
      `Mock users don't exist in the list of users fetched from the database.`,
    );
    assertEquals(
      createdUsers.map((createdUser) => removeVersionstamp(createdUser)),
      mockUsers,
    );
  });

  await t.step("read", async () => {
    const user = await db.users.findFirst({
      where: { id: mockUsers[0].id },
    });

    const userByNonIndexedKey = await db.users.findFirst({
      where: { name: mockUsers[0].name },
    });
    const twoIndexes = await db.users.findFirst({
      where: { name: mockUsers[0].name, id: mockUsers[0].id },
    });

    assertEquals(removeVersionstamp(twoIndexes), mockUsers[0]);
    assertEquals(removeVersionstamp(user), mockUsers[0]);
    assertEquals(removeVersionstamp(userByNonIndexedKey), mockUsers[0]);
  });

  await t.step("deleteMany", async () => {
    await db.users.deleteMany({
      where: { createdAt: new Date(1337) },
    });

    for await (const res of getKvInstance(db).list({ prefix: ["users"] })) {
      assertEquals(
        (res.value as z.infer<typeof User>).id,
        "67218087-d9a8-4a57-b058-adc01f179ff9",
      );
    }
  });

  await t.step("update", async () => {
    const fetchedUser = await db.users.findFirst({
      where: { id: "67218087-d9a8-4a57-b058-adc01f179ff9" },
    });
    assertExists(fetchedUser);

    // With `versionstamp`
    const updatedUser = await db.users.update({
      where: {
        id: "67218087-d9a8-4a57-b058-adc01f179ff9",
        versionstamp: fetchedUser.versionstamp,
      },
      data: {
        name: "Mock User Updated",
        versionstamp: fetchedUser.versionstamp,
      },
    });

    // @todo: without versionstamp?

    const fetchedUpdatedUser = await db.users.findFirst({
      where: { id: "67218087-d9a8-4a57-b058-adc01f179ff9" },
    });

    // Illegal update throws
    /* assertThrows(async () => await db.users.update({
			where: { id: mockUsers[0].id },
			data: { lastName: 'Hello World' }
		})) */

    assertEquals(removeVersionstamp(updatedUser), {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "Mock User Updated",
    });
    assertEquals(removeVersionstamp(fetchedUpdatedUser), {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "Mock User Updated",
    });
  });

  await t.step("updateMany", async () => {
    await db.users.create({
      data: {
        createdAt: new Date(0),
        id: "139c5467-bb1d-40e5-a977-1f14b9a37dc9",
        name: "Jane",
      },
    });

    await db.users.create({
      data: {
        createdAt: new Date(0),
        id: "bfa592aa-e0c7-466e-8925-2ee2320d3c96",
        name: "Jane",
      },
    });

    const updatedUsers = await db.users.updateMany({
      where: {
        name: "Jane",
      },
      data: {
        name: "Jane Updated",
      },
    });

    const fetchedUpdatedUsers = await db.users.findMany({
      where: { name: "Jane Updated" },
    });

    assertEquals(removeVersionstamp(updatedUsers[0]), {
      createdAt: new Date(0),
      id: "139c5467-bb1d-40e5-a977-1f14b9a37dc9",
      name: "Jane Updated",
    });
    assertEquals(removeVersionstamp(updatedUsers[1]), {
      createdAt: new Date(0),
      id: "bfa592aa-e0c7-466e-8925-2ee2320d3c96",
      name: "Jane Updated",
    });

    assertEquals(removeVersionstamp(fetchedUpdatedUsers[0]), {
      createdAt: new Date(0),
      id: "139c5467-bb1d-40e5-a977-1f14b9a37dc9",
      name: "Jane Updated",
    });
    assertEquals(removeVersionstamp(fetchedUpdatedUsers[1]), {
      createdAt: new Date(0),
      id: "bfa592aa-e0c7-466e-8925-2ee2320d3c96",
      name: "Jane Updated",
    });
  });

  await clearMocks();
});
