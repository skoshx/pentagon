import { z } from "../deps.ts";
import { KeyPropertySchema } from "./keys.ts";

export type PentagonResult<T extends Record<string, TableDefinition>> = {
  [K in keyof T]: {
    findFirst: (args: QueryArgs<T[K]>) => QueryResponse<T[K]>;
    findFirstOrThrow: (args: QueryArgs<T[K]>) => QueryResponse<T[K]>;
    findMany: (args: QueryArgs<T[K]>) => Array<QueryResponse<T[K]>>;
    findUnique: (args: QueryArgs<T[K]>) => QueryResponse<T[K]>;
    findUniqueOrThrow: (args: QueryArgs<T[K]>) => QueryResponse<T[K]>;
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
    delete: (args: QueryArgs<T[K]>) => QueryResponse<T[K]>;
    deleteMany: (args: QueryArgs<T[K]>) => Array<QueryResponse<T[K]>>;
    aggregate: (args: QueryArgs<T[K]>) => QueryResponse<T[K]>;
  };
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

export type QueryResponse<T extends TableDefinition> = z.output<T["schema"]>;
export type CreateAndUpdateResponse<T extends TableDefinition> = z.output<
  T["schema"]
>;

export type CreateAndUpdateArgs<T extends TableDefinition> = QueryArgs<T> & {
  data: Partial<z.input<T["schema"]>>;
};

type QueryArgs<T extends TableDefinition> = {
  where?: Partial<z.infer<T["schema"]>>;
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

// CRUD types
/* export type SecondaryKey = Record<string, string>;
export type PrimaryKey = string; */

export type AccessKey = {
  primary?: true;
  suffix?: string; // eg. "_by_email"
  unique?: true;
  value: Deno.KvKeyPart;
};

export type KeyProperty = z.infer<typeof KeyPropertySchema>;
