import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
} from "./util.ts";
import { removeVersionstamp } from "../src/util.ts";

Deno.test("select", async () => {
  const db = createMockDatabase();
  await populateMockDatabase(db);

  // Select
  const userWithSelect = await db.users.findFirst({
    where: { name: "John Doe" },
    select: {
      id: true,
    },
  });

  // @ts-expect-error: to test types
  console.log(userWithSelect.createdAt); // undefined
  // @ts-expect-error: to test types
  console.log(userWithSelect.name); // undefined

  assertEquals(removeVersionstamp(userWithSelect), {
    id: "67218087-d9a8-4a57-b058-adc01f179ff9",
  });

  await clearMocks();
});
