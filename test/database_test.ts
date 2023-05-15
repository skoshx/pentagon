import { createMockDatabase } from "./util.ts";

Deno.test("createDatabase", async (t) => {
  // Setting up
  await t.step("creates database", () => {
    createMockDatabase();
  });
});
