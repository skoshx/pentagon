import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  kv,
  populateMockDatabase,
  removeVersionstamps,
  User,
} from "./util.ts";
import { z } from "../deps.ts";
import {
  keysToIndexes,
  schemaToKeys,
  selectFromEntry,
  whereToKeys,
} from "../src/keys.ts";

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

Deno.test("keysToIndexes", () => {
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

Deno.test("whereToKeys", async (t) => {
  const db = await createMockDatabase();
  await clearMocks();
  await populateMockDatabase(db);

  await t.step("primary key", async () => {
    const whereQuery = {
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
    };
    const accessKeys = schemaToKeys(User, whereQuery);
    const indexKeys = keysToIndexes("users", accessKeys);
    const foundItems = await whereToKeys(kv, "users", indexKeys, whereQuery);
    assertEquals(removeVersionstamps(foundItems), [
      {
        key: [
          "users",
          "67218087-d9a8-4a57-b058-adc01f179ff9",
        ],
        value: {
          createdAt: new Date(0),
          id: "67218087-d9a8-4a57-b058-adc01f179ff9",
          name: "John Doe",
        },
      },
    ]);
  });

  await t.step("non indexed key", async () => {
    const whereQuery = {
      name: "John Doe",
    };
    const accessKeys = schemaToKeys(User, whereQuery);
    const indexKeys = keysToIndexes("users", accessKeys);
    const foundItems = await whereToKeys(kv, "users", indexKeys, whereQuery);
    assertEquals(removeVersionstamps(foundItems), [
      {
        key: [
          "users",
          "67218087-d9a8-4a57-b058-adc01f179ff9",
        ],
        value: {
          createdAt: new Date(0),
          id: "67218087-d9a8-4a57-b058-adc01f179ff9",
          name: "John Doe",
        },
      },
    ]);
  });

  await t.step("nonexistent keys", async () => {
    const whereQuery = {
      id: "nonexistent",
    };
    const accessKeys = schemaToKeys(User, whereQuery);
    const indexKeys = keysToIndexes("users", accessKeys);
    const foundItems = await whereToKeys(kv, "users", indexKeys, whereQuery);
    assertEquals(foundItems, []);
  });
});

Deno.test("selectFromEntry", () => {
  const mockValue = {
    createdAt: new Date(0),
    id: "67218087-d9a8-4a57-b058-adc01f179ff9",
    name: "John Doe",
  };
  const items: Deno.KvEntry<typeof mockValue>[] = [
    {
      key: ["mock-key"],
      value: mockValue,
      versionstamp: "00000000000",
    },
  ];

  const selectedItems = selectFromEntry(items, { id: true });

  assertEquals(selectedItems[0].value.id, mockValue.id);
  // @ts-expect-error: using expect error as a type test
  assertEquals(selectedItems[0].value.createdAt, undefined);

  assertEquals(selectFromEntry(items, { id: true }), [
    {
      key: ["mock-key"],
      value: {
        id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      },
      versionstamp: "00000000000",
    },
  ]);
});
