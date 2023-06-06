import { z } from "../deps.ts";
import { RelationDefinition } from "./types.ts";

export function isToManyRelation(relationDefinition: RelationDefinition) {
  return Array.isArray(relationDefinition[1]);
}

export function getRelationSchema(
  relationDefinition: RelationDefinition,
): ReturnType<typeof z.object> {
  return isToManyRelation(relationDefinition)
    // @ts-ignore
    ? relationDefinition[1][0] as ReturnType<typeof z.object>
    : relationDefinition[1] as ReturnType<typeof z.object>;
}

/*

export type RelationDefinition = [
  relationSchemaName: string,
  relationSchema: ReturnType<typeof z.object>[] | ReturnType<typeof z.object>,
  localKey: LocalKey | undefined,
  foreignKey: ForeignKey,
];

*/

// @todo(skoshx): validate relation target etc…

export function isValidRelationDefinition(
  relationDefinition: RelationDefinition,
) {
  // @todo(skoshx): implement
  return false;
}
