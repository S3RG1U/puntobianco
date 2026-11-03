import { apiRoute } from "@/lib/api/route";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const GET = apiRoute({ auditPath: "v1/me" }, async (_request, actor) => ({
  body: { data: { id: actor.user.id, name: actor.user.name, roles: actor.user.role, scopes: actor.scopes } },
}));
