import { createPentagon } from "pentagon";
import { z } from "zod";

export const User = z.object({
  id: z.string().uuid().describe("primary"),
  createdAt: z.date(),
  name: z.string(),
});

export const TodoTask = z.object({
  id: z.string().uuid().describe("primary"),
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
      tasks: ["tasks", [TodoTask], "", "userId"],
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
