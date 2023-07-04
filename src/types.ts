/// <reference lib="deno.unstable" />
import { z } from "../deps.ts";
import { KeyPropertySchema } from "./keys.ts";
export interface PentagonMethods<T extends TableDefinition> {
  findFirst: <Args extends QueryArgs<T>>(
    args: Args,
  ) => Promise<QueryResponse<T, Args>>;

  // findFirstOrThrow: (
  //   args: QueryArgs<T>,
  // ) => QueryResponse<T, typeof args>;

  findMany: <Args extends QueryArgs<T>>(
    args: Args,
  ) => Promise<Array<QueryResponse<T, Args>>>;

  // findUnique: (args: QueryArgs<T>) => QueryResponse<T, typeof args>;

  // findUniqueOrThrow: (
  //   args: QueryArgs<T>,
  // ) => QueryResponse<T, typeof args>;

  create: <Args extends CreateArgs<T>>(
    args: Args,
  ) => Promise<CreateAndUpdateResponse<T>>;

  createMany: <Args extends CreateManyArgs<T>>(
    args: Args,
  ) => Promise<CreateAndUpdateResponse<T>[]>;

  update: <Args extends UpdateArgs<T>>(
    args: Args,
  ) => Promise<CreateAndUpdateResponse<T>>;

  updateMany: <Args extends UpdateArgs<T>>(
    args: Args,
  ) => Promise<Array<CreateAndUpdateResponse<T>>>;

  // upsert: (args: CreateAndUpdateArgs<T>) => CreateAndUpdateResponse<T>;

  // count: (args: QueryArgs<T>) => number;

  // @ts-ignore TODO: delete should not use QueryArgs or QueryResponse
  delete: <Args extends QueryArgs<T>>(
    args: Args,
  ) => Promise<QueryResponse<T, Args>>;

  // @ts-ignore TODO: deleteMany should not use QueryArgs or QueryResponse
  deleteMany: <Args extends QueryArgs<T>>(
    args: Args,
  ) => Promise<QueryResponse<T, Args>>;

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
  versionstamp: string | null | undefined;
};

export type LocalKey = string;
export type ForeignKey = string;

/**
 * [relation name, schema, local key, foreign key]
 */
export type RelationDefinition = [
  relationSchemaName: string,
  /**
   * If you provide this as an array, the relation is treated as a
   * to-many relation, if it's not an array, then its treated as a
   * to-one relation.
   */
  relationSchema: [ReturnType<typeof z.object>] | ReturnType<typeof z.object>,
  /**
   * LocalKey is a string if this schema is the one defining the relation,
   * undefined if this schema is the target of the relation.
   */
  localKey: LocalKey,
  foreignKey: ForeignKey,
];

export type TableDefinition = {
  schema: ReturnType<typeof z.object>;
  relations?: Record<string, RelationDefinition>;
};

export type QueryResponse<
  T extends TableDefinition,
  PassedInArgs extends QueryArgs<T>,
> = WithVersionstamp<
  & Select<T, PassedInArgs["select"]>
  & Include<T["relations"], PassedInArgs["include"]>
>;

type Nothing = {};

type Select<
  T extends TableDefinition,
  Selected extends QueryArgs<T>["select"] | undefined,
> = Selected extends Partial<Record<string, unknown>>
  ? Pick<z.output<T["schema"]>, keyof Selected & string>
  : z.output<T["schema"]>;
type Include<
  Relations extends TableDefinition["relations"],
  ToBeIncluded extends IncludeDetails<Relations> | undefined,
> = Relations extends Record<string, RelationDefinition>
  ? ToBeIncluded extends Record<string, unknown> ? {
      [Rel in keyof Relations]: Relations[Rel][1] extends
        [{ _output: infer OneToManyRelatedSchema }]
        ? ToBeIncluded extends
          Record<Rel, infer DetailsToInclude extends Record<string, unknown>>
          ? MatchAndSelect<OneToManyRelatedSchema, DetailsToInclude>[]
        : ToBeIncluded extends Record<Rel, true> ? OneToManyRelatedSchema[]
        : Nothing
        : Relations[Rel][1] extends { _output: infer OneToOneRelatedSchema }
          ? ToBeIncluded extends
            Record<Rel, infer DetailsToInclude extends Record<string, unknown>>
            ? ToBeIncluded extends Record<Rel, true>
              ? MatchAndSelect<OneToOneRelatedSchema, DetailsToInclude>
            : Nothing
          : OneToOneRelatedSchema
        : Nothing;
    }
  : Nothing
  : Nothing;

type MatchAndSelect<SourceSchema, ToBeIncluded> = {
  [Key in Extract<keyof SourceSchema, keyof ToBeIncluded>]:
    ToBeIncluded[Key] extends infer ToInclude
      ? SourceSchema[Key] extends infer Source ? ToInclude extends true ? Source
        : MatchAndSelect<Source, ToInclude>
      : never
      : never;
};

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
export type CreateManyArgs<T extends TableDefinition> =
  & Pick<QueryArgs<T>, "select">
  & {
    data: z.input<T["schema"]>[];
  };
export type UpdateArgs<T extends TableDefinition> = QueryArgs<T> & {
  data: Partial<WithMaybeVersionstamp<z.input<T["schema"]>>>;
};

export type QueryKvOptions = Parameters<Deno.Kv["get"]>[1];

type IncludeDetails<Relations extends TableDefinition["relations"]> =
  Relations extends Record<string, RelationDefinition> ? {
      [Rel in keyof Relations]?:
        | true
        | (Relations[Rel][1] extends [{ _output: infer OneToManyRelatedSchema }]
          ? Includable<OneToManyRelatedSchema>
          : Relations[Rel][1] extends { _output: infer OneToOneRelatedSchema }
            ? Includable<OneToOneRelatedSchema>
          : never);
    }
    : never;

type Includable<T> = T extends Record<string, unknown>
  ? { [K in keyof T]?: true | Includable<T[K]> }
  : never;

export type QueryArgs<T extends TableDefinition> = {
  where?: Partial<WithMaybeVersionstamp<z.infer<T["schema"]>>>;
  take?: number;
  skip?: number;
  select?: Partial<Record<keyof z.infer<T["schema"]>, true>>;
  orderBy?: Partial<z.infer<T["schema"]>>;
  include?: IncludeDetails<T["relations"]>;
  distinct?: Array<keyof z.infer<T["schema"]>>;
  kvOptions?: QueryKvOptions;
};

export type AccessKey =
  & {
    value: Deno.KvKeyPart;
  }
  & (
    | { type: "primary" }
    | { type: "index"; suffix: string }
    | { type: "unique"; suffix: string }
  );

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
