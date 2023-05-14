import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { add, createPentagon } from "./main.ts";
import { z } from "./deps.ts";

Deno.test(function addTest() {
  assertEquals(add(2, 3), 5);
});

// Mocks

const User = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
});

Deno.test("createDatabase", async (t) => {
  // Setting up
  let db: ReturnType<typeof createPentagon> | undefined = undefined;
  await t.step("creates database correctly", () => {
    db = createPentagon({
      user: {
        schema: User,
      },
    });
  });
});

Deno.test("CRUD", () => {
});

// https://deno.land/std@0.155.0/testing/bdd_examples/user_nested_test.ts
/* import {
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.155.0/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.155.0/testing/bdd.ts";

describe('createDatabase', () => {

})

describe("User", () => {
  it("users initially empty", () => {
    assertEquals(User.users.size, 0);
  });

  it("constructor", () => {
    try {
      const user = new User("Kyle");
      assertEquals(user.name, "Kyle");
      assertStrictEquals(User.users.get("Kyle"), user);
    } finally {
      User.users.clear();
    }
  });

  describe("age", () => {
    let user: User;

    beforeEach(() => {
      user = new User("Kyle");
    });

    afterEach(() => {
      User.users.clear();
    });

    it("getAge", function () {
      assertThrows(() => user.getAge(), Error, "Age unknown");
      user.age = 18;
      assertEquals(user.getAge(), 18);
    });

    it("setAge", function () {
      user.setAge(18);
      assertEquals(user.getAge(), 18);
    });
  });
}); */
