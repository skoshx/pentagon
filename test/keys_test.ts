import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  kv,
  populateMockDatabase,
  User,
} from "./util.ts";
import { z } from "../deps.ts";
import { keysToItems, schemaToKeys, selectFromEntries } from "../src/keys.ts";
import { removeVersionstamps } from "../src/util.ts";

Deno.test("schemaToKeys", () => {
  const user: z.infer<typeof User> = {
    id: "73a85d83-7325-46f0-a421-1bfac4cec68a",
    createdAt: new Date(0),
    name: "John Doe",
  };
  // Primary key
  assertEquals(schemaToKeys("users", User, user), [{
    accessKey: {
      type: "primary",
      value: "73a85d83-7325-46f0-a421-1bfac4cec68a",
    },
    denoKey: ["users", "73a85d83-7325-46f0-a421-1bfac4cec68a"],
  }]);

  // No values provided
  assertEquals(schemaToKeys("users", User, {}), []);

  // Unique index
  assertEquals(
    schemaToKeys(
      "users",
      z.object({ email: z.string().email().describe("unique") }),
      {
        email: "john.doe@proton.me",
      },
    ),
    [{
      accessKey: {
        type: "unique",
        suffix: "_by_unique_email",
        value: "john.doe@proton.me",
      },
      denoKey: ["users_by_unique_email", "john.doe@proton.me"],
    }],
  );

  // index
  assertEquals(
    schemaToKeys(
      "users",
      User.extend({ color: z.string().describe("index") }),
      {
        id: "73a85d83-7325-46f0-a421-1bfac4cec68a",
        color: "blue",
      },
    ),
    [{
      accessKey: {
        type: "primary",
        value: "73a85d83-7325-46f0-a421-1bfac4cec68a",
      },
      denoKey: ["users", "73a85d83-7325-46f0-a421-1bfac4cec68a"],
    }, {
      accessKey: {
        type: "index",
        value: "blue",
        suffix: "_by_color",
      },
      denoKey: [
        "users_by_color",
        "blue",
        "73a85d83-7325-46f0-a421-1bfac4cec68a",
      ],
    }],
  );
});

Deno.test("whereToKeys", async (t) => {
  const db = createMockDatabase();
  await clearMocks();
  await populateMockDatabase(db);

  await t.step("primary key", async () => {
    const whereQuery = {
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
    };
    const keys = schemaToKeys("users", User, whereQuery);
    const foundItems = await keysToItems(kv, "users", keys, whereQuery);
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
    const keys = schemaToKeys("users", User, whereQuery);
    const foundItems = await keysToItems(kv, "users", keys, whereQuery);
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
    const keys = schemaToKeys("users", User, whereQuery);
    const foundItems = await keysToItems(kv, "users", keys, whereQuery);
    assertEquals(foundItems, []);
  });
});

Deno.test("selectFromEntries", () => {
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

  const selectedItems = selectFromEntries(items, { id: true });

  assertEquals(selectedItems[0].value.id, mockValue.id);
  // @ts-expect-error: using expect error as a type test
  assertEquals(selectedItems[0].value.createdAt, undefined);

  assertEquals(selectFromEntries(items, { id: true }), [
    {
      key: ["mock-key"],
      value: {
        id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      },
      versionstamp: "00000000000",
    },
  ]);
});
