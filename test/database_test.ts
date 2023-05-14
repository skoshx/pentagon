import { assertStrictEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";

Deno.test("createDatabase", async (t) => {
  // Setting up
  await t.step("creates database", () => {
    assertStrictEquals(true, false);
  });
});
