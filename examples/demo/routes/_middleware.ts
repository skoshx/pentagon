import { getCookies, setCookie } from "https://deno.land/std@0.209.0/http/cookie.ts";
import { FreshContext } from "$fresh/server.ts";
import {createUser, db} from "../lib/db.ts";

type State = {
  user: { id: string }
};

export async function handler(
  req: Request,
  ctx: FreshContext<State>,
) {
  const cookies = getCookies(req.headers);
  if (ctx.destination !== 'route' || cookies.userid != null) {
    if (cookies.userid) {
      ctx.state.user = await db.users.findFirst({ where: { id: cookies.userid } });
    }
    return ctx.next();
  }

  const createdUser = await createUser();
  if (!createdUser) {
    return new Response(`Oops! Something went wrong!`, { status: 500 });
  }
  ctx.state.user = createdUser;

  const resp = await ctx.next();
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 1);
  setCookie(resp.headers, { name: 'userid', value: createdUser.id, expires: expirationDate })

  return resp;
}
