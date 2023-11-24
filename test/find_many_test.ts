import { z } from "../deps.ts";
import { createPentagon } from "../mod.ts";
import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import { removeVersionstamp } from "../src/util.ts";

const User = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
});

const Order = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
  userId: z.string().uuid(),
});

const Post = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  title: z.string().describe("unique"),
  category: z.string().describe("index"),
  userId: z.string().uuid(),
});

const createDatabase = (kv: Deno.Kv) =>
  createPentagon(kv, {
    users: {
      schema: User,
      relations: {
        myOrders: ["orders", [Order], "id", "userId"],
        myPosts: ["posts", [Post], "id", "userId"],
      },
    },
    orders: {
      schema: Order,
      relations: {
        user: ["users", User, "userId", "id"],
      },
    },
    posts: {
      schema: Post,
      relations: {
        categories: ["categories", User, "userId", "id"],
      },
    },
  });

const populateDatabase = async (db: ReturnType<typeof createDatabase>) => {
  await db.users.create({
    data: {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
    },
  });

  await db.posts.create({
    data: {
      id: "0d8e7c67-5020-4964-9811-2a4392d94261",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      title: "How to use Deno KV",
      category: "Deno",
    },
  });

  await db.posts.create({
    data: {
      id: "aa68f6ab-5ae1-466c-b4a7-88469e51bb62",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      title: "Secondary indexing with Deno KV",
      category: "Deno",
    },
  });

  await db.posts.create({
    data: {
      id: "9748c2fe-27ee-4920-b9a5-a2f101e64d54",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      title: "500 ways to say hello",
      category: "Deno",
    },
  });

  await db.posts.create({
    data: {
      id: "9e168f8e-87c2-4b6c-87e3-ea148b5a05a9",
      createdAt: new Date(0),
      userId: "f4a1c868-aaf5-413b-ad21-2574876cf5b3",
      title: "How I wrote a poem in 30 days",
      category: "Poetry",
    },
  });
};

const clearDatabase = async (kv: Deno.Kv) => {
  for await (const x of kv.list({ prefix: ["users"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["orders"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["posts"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["posts_by_unique_title"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["posts_by_category"] })) {
    await kv.delete(x.key);
  }
};

Deno.test("findMany", async (t) => {
  const kv = await Deno.openKv();
  const db = createDatabase(kv);
  await clearDatabase(kv);
  await populateDatabase(db);

  await t.step("should return all posts", async () => {
    const posts = await db.posts.findMany({});

    assertEquals(posts.length, 4);
    assertEquals(removeVersionstamp(posts[0]), {
      id: "0d8e7c67-5020-4964-9811-2a4392d94261",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      title: "How to use Deno KV",
      category: "Deno",
    });
    assertEquals(removeVersionstamp(posts[1]), {
      id: "9748c2fe-27ee-4920-b9a5-a2f101e64d54",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      title: "500 ways to say hello",
      category: "Deno",
    });
    assertEquals(removeVersionstamp(posts[2]), {
      id: "9e168f8e-87c2-4b6c-87e3-ea148b5a05a9",
      createdAt: new Date(0),
      userId: "f4a1c868-aaf5-413b-ad21-2574876cf5b3",
      title: "How I wrote a poem in 30 days",
      category: "Poetry",
    });
    assertEquals(removeVersionstamp(posts[3]), {
      id: "aa68f6ab-5ae1-466c-b4a7-88469e51bb62",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      title: "Secondary indexing with Deno KV",
      category: "Deno",
    });
  });

  await t.step({
    name: "should not return duplicate posts",
    fn: async () => {
      const posts = await db.posts.findMany({
        where: {
          id: "aa68f6ab-5ae1-466c-b4a7-88469e51bb62",
          title: "Secondary indexing with Deno KV",
          category: "Deno",
        },
      });

      assertEquals(posts.length, 1);
      assertEquals(removeVersionstamp(posts[0]), {
        id: "aa68f6ab-5ae1-466c-b4a7-88469e51bb62",
        createdAt: new Date(0),
        userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
        title: "Secondary indexing with Deno KV",
        category: "Deno",
      });
    },
  });

  await t.step({
    name: "should treat where as AND operation",
    fn: async () => {
      const posts = await db.posts.findMany({
        where: {
          id: "aa68f6ab-5ae1-466c-b4a7-88469e51bb62",
          title: "Secondary indexing with Deno KV",
          category: "THIS IS INVALID",
        },
      });

      assertEquals(posts.length, 0);
    },
  });

  // @todo(Danielduel):
  // I would really like to be able to do stuff like this,
  // but I am not sure if it makes sense from the point of view of the database.
  // await t.step({
  //   name: "should return all of index",
  //   fn: async () => {
  //     const posts = await db.posts.findMany({
  //       where: {
  //         category: "Deno"
  //       }
  //     });

  //     assertEquals(posts.length, 0);
  //   },
  // });

  await clearDatabase(kv);
  kv.close();
});
