import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { db, TodoTask, User } from "../lib/db.ts";
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import {Input} from "../components/ui/input.tsx";
import {Button} from "../components/ui/button.tsx";

type Task = z.infer<typeof TodoTask>;
type User = z.infer<typeof User>;
type TasksAndUser = { tasks: Task[]; user: User };

function parseCookie(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookiePairs = cookieString.split(";");

  for (const cookiePair of cookiePairs) {
    const [name, value] = cookiePair.trim().split("=");
    cookies[name] = value;
  }

  return cookies;
}

export const handler: Handlers<any, TasksAndUser> = {
  async GET(req, ctx) {

    // Get my tasks
    const tasks = await db.tasks.findMany({
      where: { userId: ctx.state?.user.id },
    });

    return ctx.render({ tasks, user: ctx.state?.user });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const description = form.get("description")?.toString();

    if (!description || !ctx.state?.user) {
      return new Response("Bad request", { status: 400 });
    }
    const createdTask = await db.tasks.create({
      data: {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        description,
        userId: ctx.state.user.id,
        completed: false,
      },
    });

    return Response.redirect(req.url);
  },
};

export default function Home({ data: { tasks, user } }: PageProps<TasksAndUser>) {
  return (
    <>
      <Head>
        <title>Pentagon Todo List</title>
      </Head>
      <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back {user.name}!
            </h2>
            <p className="text-muted-foreground">
              Your user id is{" "}
              {user.id}, here&apos;s a list of your tasks for this month!
            </p>
          </div>
        </div>
        {user && <form className="flex gap-2 w-full" method="POST">
          <Input
              placeholder="What should I do today?"
              name="description"
          />
          <Button type="submit">Save</Button>
        </form>}
        {tasks.length === 0 && <h1>No Tasks Found!</h1>}
        {tasks.length > 0 &&
            tasks.map((task) => <h1 key={task.id}>{task.description}</h1>)}
      </div>
    </>
  );
}
