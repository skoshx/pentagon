import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "https://deno.land/x/fresh@1.1.6/server.ts";
import { db, TodoTask, User } from "../lib/db.ts";
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import SubmitTask from "../islands/SubmitTask.tsx";

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

export const handler: Handlers<TasksAndUser | null> = {
  async GET(req, ctx) {
    const { userid: userId } = parseCookie(req.headers.get("cookie") ?? "");
    if (!userId) {
      // Reload headers
      return new Response("Please reload!");
    }

    // Get my tasks
    const tasks = await db.tasks.findMany({
      where: { userId },
    });

    const user = await db.users.findFirst({ where: { id: userId } });

    return ctx.render({ tasks, user });
  },
  async POST(req) {
    type RequestType = {
      description: string;
      userId: string;
    };
    const requestBody: RequestType = await req.json();
    if (!requestBody.description || !requestBody.userId) {
      return new Response("Bad request", { status: 400 });
    }
    const createdTask = await db.tasks.create({
      data: {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        description: requestBody.description,
        userId: requestBody.userId,
        completed: false,
      },
    });

    return new Response(JSON.stringify(createdTask), {
      headers: new Headers({ "Content-Type": "application/json" }),
    });
  },
};

export default function Home({ data }: PageProps<TasksAndUser | null>) {
  return (
    <>
      <Head>
        <title>Pentagon Todo List</title>
      </Head>
      <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back {data?.user.name}!
            </h2>
            <p className="text-muted-foreground">
              Your user id is{" "}
              {data?.user.id}, here&apos;s a list of your tasks for this month!
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/*<UserNav />*/}
          </div>
        </div>
        {/*<DataTable data={tasks} columns={columns} />*/}
        {data?.user && <SubmitTask userId={data.user.id} />}
        {data && data.tasks.length === 0 && <h1>No Tasks Found!</h1>}
        {data && data.tasks.length > 0 &&
          data.tasks.map((task) => <h1>{task.description}</h1>)}
      </div>
    </>
  );
}
