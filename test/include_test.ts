import { assertEquals } from "https://deno.land/std@0.186.0/testing/asserts.ts";
import {
  clearMocks,
  createMockDatabase,
  populateMockDatabase,
} from "./util.ts";
import { removeVersionstamp } from "../src/util.ts";

Deno.test("include", async (t) => {
  const db = await createMockDatabase();
  await populateMockDatabase(db);

  await t.step("include > one to one > target (one)", async () => {
    // @todo(skoshx): write test
  });
  await t.step("include > one to one > target (second one)", async () => {
    // @todo(skoshx): write test
  });

  await t.step("include > one to many > target (one)", async () => {
    const userWithOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: true,
      },
    });

    assertEquals({
      ...removeVersionstamp(userWithOrders),
      // @ts-expect-error
      myOrders: [removeVersionstamp(userWithOrders.myOrders[0])],
    }, {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
      myOrders: [{
        id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
        createdAt: new Date(0),
        userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
        name: "Cheeseburger",
      }],
    });
  });

  await t.step("include > one to many > source (many)", async () => {
    const orderWithUser = await db.orders.findFirst({
      where: { name: "Cheeseburger" },
      include: {
        user: true,
      },
    });

    assertEquals({
      ...removeVersionstamp(orderWithUser),
      // @ts-expect-error
      user: removeVersionstamp(orderWithUser.user),
    }, {
      id: "aaa62b91-a021-41c3-a2ce-ef079859d59c",
      createdAt: new Date(0),
      userId: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "Cheeseburger",
      user: {
        id: "67218087-d9a8-4a57-b058-adc01f179ff9",
        createdAt: new Date(0),
        name: "John Doe",
      },
    });
  });

  await t.step("include > many to many > target (many)", async () => {
    const playlist = await db.playlists.findFirst({
      where: {
        id: "aaa62b91-a021-41c3-a2ce-ef079859d5cc",
      },
      include: {
        songs: true,
      },
    });

    assertEquals(playlist.songs.length, 2);
    assertEquals(playlist.songs[0].title, "Zonestic");
    assertEquals(playlist.songs[1].title, "Superstar");
  });

  await t.step("include > many to many > source (many)", async () => {
    const song = await db.songs.findFirst({
      where: {
        title: "Zonestic",
      },
      include: {
        playlists: true,
      },
    });

    assertEquals(song.playlists.length, 2);
    assertEquals(song.playlists[0].title, "First songs on my feed");
    assertEquals(song.playlists[1].title, "Jammer");
  });

  // @todo(Danielduel):
  // Recurrent includes?
  // Find the playlists that have songs from given playlist
  // const playlist = await db.playlists.findFirst({
  //   where: {
  //     id: "aaa62b91-a021-41c3-a2ce-ef079859d5cc"
  //   },
  //   include: {
  //     songs: {
  //       playlists: true
  //     },
  //   }
  // })

  await t.step("include > select", async () => {
    const userWithPartialOrders = await db.users.findFirst({
      where: { name: "John Doe" },
      include: {
        myOrders: {
          name: true,
          createdAt: true,
        },
      },
    });

    assertEquals({
      ...removeVersionstamp(userWithPartialOrders),
      // @ts-expect-error
      myOrders: [removeVersionstamp(userWithPartialOrders.myOrders[0])],
    }, {
      createdAt: new Date(0),
      id: "67218087-d9a8-4a57-b058-adc01f179ff9",
      name: "John Doe",
      myOrders: [{
        name: "Cheeseburger",
        createdAt: new Date(0),
      }],
    });
  });

  await clearMocks();
});
