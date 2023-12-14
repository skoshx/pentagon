import { createPentagon } from "https://deno.land/x/pentagon@v0.0.2/mod.ts";
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";

export const User = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
});

export const TodoTask = z.object({
  id: z.string().uuid().describe("primary, unique"),
  userId: z.string().uuid(),
  createdAt: z.date(),
  description: z.string(),
  completed: z.boolean(),
});

const kv = await Deno.openKv();

export const db = createPentagon(kv, {
  users: {
    schema: User,
    relations: {
      tasks: ["tasks", [TodoTask], undefined, "userId"],
    },
  },
  tasks: {
    schema: TodoTask,
    relations: {
      user: ["users", User, "userId", "id"],
    },
  },
});

export function createUser() {
  return db.users.create({
    data: {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      name: "Anonymous",
    },
  });
}
