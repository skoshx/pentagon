import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
  removeVersionstamp,
  User,
} from "./util.ts";
import { z } from "../deps.ts";

Deno.test("Create / Read / Update / Remove", async (t) => {
  const db = await createMockDatabase();
  await clearMocks(db);
  await populateMockDatabase(db);

  const mockUser: z.infer<typeof User> = {
    id: "9fa09a9e-d399-40a0-855e-79c0738e1079",
    createdAt: new Date(0),
    name: "Eric Example",
  };

  await t.step("create", async () => {
    const createdUser = await db.users.create({
      data: mockUser,
    });

    assertEquals(removeVersionstamp(createdUser), mockUser);
  });
  /* TODO: await t.step('createMany', async () => {
		const createdUsers = await db.users.createMany({
			data: mockUser
		})
	})*/

  await t.step("read", async () => {
    const user = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    const userByNonIndexedKey = await db.users.findFirst({
      where: { name: mockUser.name },
    });
    const twoIndexes = await db.users.findFirst({
      where: { name: mockUser.name, id: mockUser.id },
    });

    assertEquals(removeVersionstamp(twoIndexes), mockUser);
    assertEquals(removeVersionstamp(user), mockUser);
    assertEquals(removeVersionstamp(userByNonIndexedKey), mockUser);
  });

  await t.step("update", async () => {
    const fetchedUser = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    // Without `versionstamp`
    const updatedUser = await db.users.update({
      where: { id: mockUser.id, versionstamp: fetchedUser.versionstamp },
      data: { name: "Mock User Updated" },
    });

    const fetchedUpdatedUser = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    // Illegal update throws
    /* assertThrows(async () => await db.users.update({
			where: { id: mockUser.id },
			data: { lastName: 'Hello World' }
		})) */

    assertEquals(removeVersionstamp(updatedUser), {
      ...mockUser,
      name: "Mock User Updated",
    });
    assertEquals(removeVersionstamp(fetchedUpdatedUser), {
      ...mockUser,
      name: "Mock User Updated",
    });
  });

  /* await t.step("update", async () => {
    const updatedUser = await db.users.update({
      where: { id: mockUser.id },
      data: { name: "Mock User Updated" },
    });

    const fetchedUpdatedUser = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    assertEquals(removeVersionstamp(updatedUser), {
      ...mockUser,
			// ves
      name: "Mock User Updated",
    });
    assertEquals(removeVersionstamp(fetchedUpdatedUser), {
      ...mockUser,
      name: "Mock User Updated",
    });
  });

  await t.step("remove", async () => {
    const deletedUser = await db.users.delete({
      where: { id: mockUser.id },
    });
    assertEquals(removeVersionstamp(deletedUser), {
      ...mockUser,
      name: "Mock User Updated",
    });

    const nonexistentUser = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    assertEquals(nonexistentUser, null);
  }); */

  // db.close
  await clearMocks(db);
});
