import { getCookies } from "https://deno.land/std@0.209.0/http/cookie.ts";
import { FreshContext } from "$fresh/server.ts";
import { createUser } from "../lib/db.ts";

export async function handler(
  req: Request,
  ctx: FreshContext,
) {
  const cookies = getCookies(req.headers);
  if (ctx.destination !== 'route' || cookies.userid != null) {
    return ctx.next();
  }

  const resp = await ctx.next();
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

  return resp;
}
