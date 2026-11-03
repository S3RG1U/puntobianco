// Documentation catalog. Runtime dispatch is owned by explicit route files.
import { registration, visitUpdate } from "./validation/patients";
import { apartmentCreate, apartmentAddress, accommodationAssign } from "./validation/accommodations";
import { treatmentCreate, treatmentUpdate } from "./validation/treatments";
import { caseTransition } from "./validation/cases";
import { transferPickup, transferPlan } from "./validation/transfers";

export const commands = {
  "registrations": { scope: "patient:create", schema: registration },
  "visit-update": { scope: "patient:update", schema: visitUpdate },
  "apartment-create": { scope: "accommodation:create", schema: apartmentCreate },
  "apartment-address": { scope: "accommodation:update", schema: apartmentAddress },
  "accommodation-assign": { scope: "accommodation:update", schema: accommodationAssign },
  "treatment-create": { scope: "treatment:create", schema: treatmentCreate },
  "treatment-update": { scope: "treatment:update", schema: treatmentUpdate },
  "case-transition": { scope: "backOfficeCase:update", schema: caseTransition },
  "transfer-pickup": { scope: "transfer:update", schema: transferPickup },
  "transfer-plan": { scope: "transfer:update", schema: transferPlan },
} as const;
