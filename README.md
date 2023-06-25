<p align="center">
	<img src="https://github.com/skoshx/pentagon/raw/main/docs/pentagon-banner.png" />
</p>

# pentagon

[![Github Actions][github-actions-src]][github-actions-href]

> Prisma like ORM built on top of Deno KV. Allows you to write your database
> schemas and relations using Zod schemas, and run queries using familiar syntax
> from Prisma.

## Features

- No codegen required, everything is inferred using Zod and TypeScript
- All same functions as Prisma supported (not all yet implemented)
- Support for `include`
- Support for `select`
- ~~Pagination~~ (todo)

## 💻 Example usage

```typescript
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { createPentagon } from "https://deno.land/x/pentagon/mod.ts";
const kv = await Deno.openKv();

export const User = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
});

export const Order = z.object({
  id: z.string().uuid().describe("primary, unique"),
  createdAt: z.date(),
  name: z.string(),
  userId: z.string().uuid(),
});

const db = createPentagon(kv, {
  users: {
    schema: User,
    relations: {
      myOrders: ["orders", [Order], "id", "userId"],
    },
  },
  orders: {
    schema: Order,
    relations: {
      user: ["users", User, "userId", "id"],
    },
  },
});

// Now we have unlocked the magic of Pentagon
const user = await db.users.findFirst({
  where: { name: "John Doe" },
  select: { name: true, id: true },
});

// We can also do `include` queries, fully typed!
const userWithOrders = await db.users.findFirst({
  where: { name: "John Doe" },
  include: {
    myOrders: true, // 👈 if we want the whole object
    /* myOrders: { name: true }, 👈 if we want just some parts to be included */
  },
});
```

## Relations

Defining relations works by defining the `relations` key in the table
definition. This allows us to `include` the values of relations, the same way as
we are familiar with from Prisma.

The type signature
[RelationDefinition](https://github.com/skoshx/pentagon/blob/fae437d373df89a1610a998e940c92213d3134b3/src/types.ts#LL56C24-L56C24)
explains what each of the array values represent.

Basically, we have `[relation name, schema, local key, foreign key]`.

For instance, a many-to-one relation could look like this:

```typescript
users: {
  schema: User,
  relations: {
    myOrders: ["orders", [Order], undefined, "userId"],
  },
},
orders: {
  schema: Order,
  relations: {
    user: ["users", User, "userId", "id"],
  },
},
```

## 💻 Development

Help is always appreciated, especially with getting the types right! Here's how
you can contribute:

- Clone this repository
- Fix types / add feature
- Run the tests using `deno test --unstable`
- Open PR

## Running tests

```bash
$ deno test --unstable
```

## License

Made with ❤️ in Helsinki, Finland.

Published under [MIT License](./LICENSE).

<!-- Links -->

[github-actions-href]: https://github.com/skoshx/pentagon/actions/workflows/ci.yml

<!-- Badges -->

[github-actions-src]: https://github.com/skoshx/pentagon/actions/workflows/ci.yml/badge.svg
