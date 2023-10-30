import { z } from "../deps.ts";
import { createPentagon } from "../src/pentagon.ts";

export const User = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
});

export const Order = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
  userId: z.string().uuid(),
});

export const Post = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  title: z.string(),
});

export const Category = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
});

export const Song = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  playlists: z.array(z.string()),
  title: z.string(),
});

export const Playlist = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  songs: z.array(z.string()),
  title: z.string(),
});

export const kv = await Deno.openKv();

/*

export const Post = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  title: z.string(),
})

export const Category = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
})

*/

export function createMockDatabase() {
  return createPentagon(kv, {
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
        user: ["users", User, "userId", "id"],
      },
    },
    songs: {
      schema: Song,
      relations: {
        playlists: ["playlists", [Playlist], "playlists", "id"],
      },
    },
    playlists: {
      schema: Playlist,
      relations: {
        songs: ["songs", [Song], "songs", "id"],
      },
    },
  });
}

export async function populateMockDatabase(
  db: Awaited<ReturnType<typeof createMockDatabase>>,
) {
  await db.users.create({
    data: {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
    },
  });

  await db.orders.create({
    data: {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "Cheeseburger",
    },
  });

  await db.songs.create({
    data: {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d5aa",
      createdAt: new Date(0),
      playlists: [
        "aaa62b91-a021-41c3-a2ce-ef079859d5cc",
        "aaa62b91-a021-41c3-a2ce-ef079859d5dd",
      ],
      title: "Zonestic",
    },
  });

  await db.songs.create({
    data: {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d5bb",
      createdAt: new Date(0),
      playlists: ["aaa62b91-a021-41c3-a2ce-ef079859d5cc"],
      title: "Superstar",
    },
  });

  await db.playlists.create({
    data: {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d5cc",
      createdAt: new Date(0),
      songs: [
        "aaa62b91-a021-41c3-a2ce-ef079859d5aa",
        "aaa62b91-a021-41c3-a2ce-ef079859d5bb",
      ],
      title: "First songs on my feed",
    },
  });

  await db.playlists.create({
    data: {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d5dd",
      createdAt: new Date(0),
      songs: ["aaa62b91-a021-41c3-a2ce-ef079859d5aa"],
      title: "Jammer",
    },
  });
}

export async function clearMocks() {
  for await (const x of kv.list({ prefix: ["users"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["orders"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["songs"] })) {
    await kv.delete(x.key);
  }
  for await (const x of kv.list({ prefix: ["playlists"] })) {
    await kv.delete(x.key);
  }
}
