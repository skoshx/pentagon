import { z } from "../deps.ts";
import { KeyPropertySchema } from "./keys.ts";

export interface PentagonMethods<T extends TableDefinition> {
  findFirst: (args: QueryArgs<T>) => Promise<QueryResponse<T, typeof args>>;
  // findFirstOrThrow: (
  //   args: QueryArgs<T>,
  // ) => QueryResponse<T, typeof args>;
  findMany: (
    args: QueryArgs<T>,
  ) => Promise<Array<QueryResponse<T, typeof args>>>;
  // findUnique: (args: QueryArgs<T>) => QueryResponse<T, typeof args>;
  // findUniqueOrThrow: (
  //   args: QueryArgs<T>,
  // ) => QueryResponse<T, typeof args>;
  create: (args: CreateArgs<T>) => Promise<CreateAndUpdateResponse<T>>;
  // createMany: (
  //   args: CreateAndUpdateArgs<T>,
  // ) => Array<CreateAndUpdateResponse<T>>;
  update: (args: UpdateArgs<T>) => Promise<CreateAndUpdateResponse<T>>;
  // updateMany: (
  //   args: CreateAndUpdateArgs<T>,
  // ) => Array<CreateAndUpdateResponse<T>>;
  // upsert: (args: CreateAndUpdateArgs<T>) => CreateAndUpdateResponse<T>;
  // count: (args: QueryArgs<T>) => number;
  delete: (args: QueryArgs<T>) => Promise<QueryResponse<T, typeof args>>;
  deleteMany: (
    args: QueryArgs<T>,
  ) => Promise<QueryResponse<T, typeof args>>;
  // aggregate: (args: QueryArgs<T>) => QueryResponse<T, typeof args>;
}

export type PentagonResult<T extends Record<string, TableDefinition>> = {
  [K in keyof T]: PentagonMethods<T[K]>;
};
/*  & {
  // Built-in functions
  close: () => Promise<void>;
  getKv: () => Deno.Kv;
}; */

// @todo rename to something like WithVersionstamp
export type WithVersionstamp<T> = T & {
  versionstamp: string;
};
export type WithMaybeVersionstamp<T> = T & {
  versionstamp: string | null;
};

export type LocalKey = string;
export type ForeignKey = string;

/**
 * [relation name, schema, local key, foreign key]
 */
export type RelationDefinition = [
  relationSchemaName: string,
  // relationSchema: ReturnType<typeof z.object>,
  /**
   * If you provide this as an array, the relation is treated as a
   * to-many relation, if it's not an array, then its treated as a
   * to-one relation.
   */
  relationSchema: ReturnType<typeof z.object>[] | ReturnType<typeof z.object>,
  /**
   * LocalKey is a string if this schema is the one defining the relation,
   * undefined if this schema is the target of the relation.
   */
  localKey: LocalKey | undefined,
  foreignKey: ForeignKey,
];

export type TableDefinition = {
  schema: ReturnType<typeof z.object>;
  relations?: Record<string, RelationDefinition>;
};

/* export type QueryResponse<T extends TableDefinition> = CreatedOrUpdatedItem<
  z.output<T["schema"]>
>; */

export type QueryResponse<
  T extends TableDefinition,
  PassedInArgs extends QueryArgs<T>,
> = WithVersionstamp<
  // @todo: these types need fixing
  z.output<T["schema"]>
>; // & PassedInArgs['include'] extends undefined ? {} : PassedInArgs['include']

export type DeleteResponse = { versionstamp: string };
export type CreateAndUpdateResponse<T extends TableDefinition> =
  WithVersionstamp<
    z.output<
      T["schema"]
    >
  >;

export type CreateArgs<T extends TableDefinition> =
  & Pick<QueryArgs<T>, "select">
  & {
    data: z.input<T["schema"]>;
  };
export type UpdateArgs<T extends TableDefinition> = QueryArgs<T> & {
  data: Partial<z.input<T["schema"]>>;
};

export type KvOptions = Parameters<Deno.Kv["get"]>[1];

export type QueryArgs<T extends TableDefinition> = {
  where?: Partial<z.infer<T["schema"]> & WithVersionstamp<T>>;
  take?: number;
  skip?: number;
  select?: Partial<z.infer<T["schema"]>>;
  orderBy?: Partial<z.infer<T["schema"]>>;
  include?: {
    [K in keyof T["relations"]]:
      | true
      | Partial<
        {
          // @ts-expect-error -> TypeScript wizards, help me fix this!
          [KK in keyof z.infer<T["relations"][K][1]>]: true;
        }
      >;
  };
  distinct?: Array<keyof z.infer<T["schema"]>>;
  kvOptions?: KvOptions;
};

export type AccessKey = {
  primary?: true;
  suffix?: string; // eg. "_by_email"
  unique?: true;
  value: Deno.KvKeyPart;
};

export type KeyProperty = z.infer<typeof KeyPropertySchema>;

export type DatabaseValue<T = unknown> =
  | undefined
  | null
  | boolean
  | number
  | string
  | bigint
  | Uint8Array
  | Array<T>
  | Record<string | number | symbol, T>
  | Map<unknown, unknown>
  | Set<T>
  | Date
  | RegExp;
