import { assertStrictEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
  User,
} from "./util.ts";
import { z } from "../deps.ts";

Deno.test("Create / Read / Update / Remove", async (t) => {
  const db = await createMockDatabase();
  await populateMockDatabase(db);

  const mockUser: z.infer<typeof User> = {
    id: "9fa09a9e-d399-40a0-855e-79c0738e1079",
    createdAt: new Date(0),
    name: "Mock User",
  };

  await t.step("create", async () => {
    const createdUser = await db.users.create({
      data: mockUser,
    });

    assertStrictEquals(createdUser, mockUser);
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

    assertStrictEquals(user, mockUser);
  });

  await t.step("update", async () => {
    const updatedUser = await db.users.update({
      where: { id: mockUser.id },
      data: { name: "Mock User Updated" },
    });

    const fetchedUpdatedUser = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    assertStrictEquals(updatedUser, {
      ...mockUser,
      name: "Mock User Updated",
    });
    assertStrictEquals(fetchedUpdatedUser, {
      ...mockUser,
      name: "Mock User Updated",
    });
  });

  await t.step("remove", async () => {
    const deletedUser = await db.users.delete({
      where: { id: mockUser.id },
    });
    assertStrictEquals(deletedUser, {
      ...mockUser,
      name: "Mock User Updated",
    });

    const nonexistentUser = await db.users.findFirst({
      where: { id: mockUser.id },
    });

    assertStrictEquals(nonexistentUser, null);
  });

  await clearMocks(db);
});
