import { z } from "../deps.ts";
import { KeyPropertySchema } from "./keys.ts";

export type PentagonResult<T extends Record<string, TableDefinition>> = {
  [K in keyof T]: {
    findFirst: (args: QueryArgs<T[K]>) => QueryResponse<T[K], typeof args>;
    findFirstOrThrow: (
      args: QueryArgs<T[K]>,
    ) => QueryResponse<T[K], typeof args>;
    findMany: (
      args: QueryArgs<T[K]>,
    ) => Array<QueryResponse<T[K], typeof args>>;
    findUnique: (args: QueryArgs<T[K]>) => QueryResponse<T[K], typeof args>;
    findUniqueOrThrow: (
      args: QueryArgs<T[K]>,
    ) => QueryResponse<T[K], typeof args>;
    create: (args: CreateAndUpdateArgs<T[K]>) => CreateAndUpdateResponse<T[K]>;
    createMany: (
      args: CreateAndUpdateArgs<T[K]>,
    ) => Array<CreateAndUpdateResponse<T[K]>>;
    update: (args: CreateAndUpdateArgs<T[K]>) => CreateAndUpdateResponse<T[K]>;
    updateMany: (
      args: CreateAndUpdateArgs<T[K]>,
    ) => Array<CreateAndUpdateResponse<T[K]>>;
    upsert: (args: CreateAndUpdateArgs<T[K]>) => CreateAndUpdateResponse<T[K]>;
    count: (args: QueryArgs<T[K]>) => number;
    delete: (args: QueryArgs<T[K]>) => QueryResponse<T[K], typeof args>;
    deleteMany: (
      args: QueryArgs<T[K]>,
    ) => Array<QueryResponse<T[K], typeof args>>;
    aggregate: (args: QueryArgs<T[K]>) => QueryResponse<T[K], typeof args>;
  };
}; /*  & {
  // Built-in functions
  close: () => Promise<void>;
  getKv: () => Deno.Kv;
}; */

// @todo rename to something like WithVersionstamp
export type WithVersionstamp<T> = T & {
  versionstamp: string | null;
};
export type CreatedOrUpdatedItem<T> = T & {
  versionstamp: string;
};

export type LocalKey = string;
export type ForeignKey = string;

/**
 * [schema, local key, foreign key]
 */
export type RelationDefinition = [
  relationSchemaName: string,
  relationSchema: ReturnType<typeof z.object>,
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
  CreatedOrUpdatedItem<
    z.output<
      T["schema"]
    >
  >;

export type CreateAndUpdateArgs<T extends TableDefinition> = QueryArgs<T> & {
  data: Partial<z.input<T["schema"]>>;
};

type QueryArgs<T extends TableDefinition> = {
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
  // kvOptions?: Parameters<typeof Deno.Kv>[1];
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
  | Object
  | Map<any, any>
  | Set<T>
  | Date
  | RegExp;
