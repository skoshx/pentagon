import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { User } from "./util.ts";
import { z } from "../deps.ts";
import { keysToIndexes, schemaToKeys } from "../src/keys.ts";

Deno.test("schemaToKeys", () => {
  const user: z.infer<typeof User> = {
    id: "73a85d83-7325-46f0-a421-1bfac4cec68a",
    createdAt: new Date(0),
    name: "John Doe",
  };
  // Primary key
  assertEquals(schemaToKeys(User, user), [{
    primary: true,
    unique: true,
    value: "73a85d83-7325-46f0-a421-1bfac4cec68a",
  }]);

  // No values provided
  assertEquals(schemaToKeys(User, {}), []);

  assertEquals(
    schemaToKeys(User.extend({ email: z.string().email().describe("index") }), {
      email: "john.doe@proton.me",
    }),
    [{
      suffix: "_by_email",
      value: "john.doe@proton.me",
    }],
  );
});

Deno.test("transformKeyToIndexes", () => {
  // Primary key
  assertEquals(
    keysToIndexes("users", [{
      primary: true,
      value: "73a85d83-7325-46f0-a421-1bfac4cec68a",
    }]),
    [["users", "73a85d83-7325-46f0-a421-1bfac4cec68a"]],
  );

  // Index
  assertEquals(
    keysToIndexes("users", [{
      value: "john.doe@proton.me",
      suffix: "_by_email",
    }]),
    [["users_by_email", "john.doe@proton.me"]],
  );

  // Indexes for unindexed values (everything other than `primary` & `index` keys)
  assertEquals(keysToIndexes("users", []), []);
});
