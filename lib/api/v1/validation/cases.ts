import { z } from "zod";
import { uuid } from "./common";


export const caseTransition = z.strictObject({ id: uuid, action: z.enum(["start", "complete"]) });
