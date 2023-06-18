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

// @todo(skoshx): validate relation target etc…
export function isValidRelationDefinition(
  _relationDefinition: RelationDefinition,
) {
  // @todo(skoshx): implement
  throw new Error("Not implemented");
}
