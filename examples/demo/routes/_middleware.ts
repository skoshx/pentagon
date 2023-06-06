import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { createUser } from "../lib/db.ts";

interface State {
  data: string;
}

export async function handler(
  _: Request,
  ctx: MiddlewareHandlerContext<State>,
) {
  const resp = await ctx.next();
  const userId = resp.headers.get("userid");

  if (!userId) {
    const createdUser = await createUser();
    if (!createdUser) {
      return new Response(`Oops! Something went wrong!`, { status: 500 });
    }
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);
    resp.headers.set(
      `set-cookie`,
      `userid=${createdUser.id}; Path=/; Expires=${expirationDate.toUTCString()}; HttpOnly`,
    );
  }

  return resp;
}
