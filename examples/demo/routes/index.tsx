import {Head} from "$fresh/runtime.ts";
import {Handlers, PageProps} from "$fresh/server.ts";
import {db, TodoTask, User} from "../lib/db.ts";
import {z} from "https://deno.land/x/zod@v3.21.4/mod.ts";
import Input from "../components/ui/input.tsx";
import Button from "../components/ui/button.tsx";

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

export default function Home(
  { data: { tasks, user } }: PageProps<TasksAndUser>,
) {
  return (
    <>
      <Head>
        <title>Pentagon Todo List</title>
      </Head>

      <header className="flex items-center justify-between space-y-2 md:container md:mx-auto py-8 flex-wrap px-4 md:px-0">
        <p class="text-2xl font-bold tracking-tight">
          Welcome back {user.name}!
        </p>
        <p class="text-muted-foreground">
          Your user id is{" "}
          {user.id}, here&apos;s a list of your tasks for this month!
        </p>
      </header>
      <form class="w-full bg-slate-100 py-8 px-4 md:px-0" method="POST">
        <fieldset class="flex gap-2 md:container md:mx-auto">
          <Input
            placeholder="What should I do today?"
            class="flex-1"
            name="description"
          />
          <Button type="submit">Save</Button>
        </fieldset>
      </form>
      <article class="py-8 md:container md:mx-auto px-4 md:px-0">
        {tasks.length === 0
          ? <p>No Tasks Found!</p>
          : <ul class="list-disc list-inside">{tasks.map((task) => <li key={task.id}>{task.description}</li>)}</ul>
        }
      </article>
    </>
  );
}
