import { z } from "zod";

export const scopes = ["patient:read", "patient:create", "patient:update", "treatment:read", "treatment:create", "treatment:update", "accommodation:read", "accommodation:create", "accommodation:update", "transfer:read", "transfer:update", "backOfficeCase:read", "backOfficeCase:update"] as const;
export const scopeSchema = z.enum(scopes);
