import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth tables, including the columns added by its admin plugin.
// Run `pnpm db:generate` then `pnpm db:migrate` after changing them.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const apartmentType = pgEnum("apartment_type", [
  "studio",
  "one_bedroom_sofa",
  "two_bedrooms",
  "two_bedrooms_living",
]);
export const transferDirection = pgEnum("transfer_direction", [
  "one_way",
  "round_trip",
]);

// Identity is separate from visits so returning patients keep their history.
// Companions are also registered here, even when they do not receive treatment.
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "patients_first_name_not_empty",
      sql`length(trim(${t.firstName})) > 0`,
    ),
    check("patients_last_name_not_empty", sql`length(trim(${t.lastName})) > 0`),
  ],
);

// A visit contains the registration requirements for one treatment patient.
export const patientVisits = pgTable(
  "patient_visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    coordinatorId: text("coordinator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    arrivalAt: timestamp("arrival_at", { withTimezone: true }).notNull(),
    departureAt: timestamp("departure_at", { withTimezone: true }).notNull(),
    availabilityNotes: text("availability_notes").notNull().default(""),
    treatment: text("treatment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("patient_visits_id_patient_unique").on(t.id, t.patientId),
    index("patient_visits_patient_idx").on(t.patientId),
    index("patient_visits_coordinator_idx").on(t.coordinatorId),
    index("patient_visits_arrival_idx").on(t.arrivalAt),
    check("patient_visits_dates_valid", sql`${t.departureAt} > ${t.arrivalAt}`),
    check(
      "patient_visits_treatment_not_empty",
      sql`length(trim(${t.treatment})) > 0`,
    ),
  ],
);

// Absence of a row means no companion. A linked visit means the companion
// also receives treatment, with the exact same registration fields.
export const patientCompanions = pgTable(
  "patient_companions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => patientVisits.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    treatmentVisitId: uuid("treatment_visit_id"),
  },
  (t) => [
    unique("patient_companions_visit_patient_unique").on(
      t.visitId,
      t.patientId,
    ),
    index("patient_companions_patient_idx").on(t.patientId),
    foreignKey({
      name: "companion_treatment_visit_patient_fk",
      columns: [t.treatmentVisitId, t.patientId],
      foreignColumns: [patientVisits.id, patientVisits.patientId],
    }).onDelete("restrict"),
    check(
      "patient_companions_not_same_visit",
      sql`${t.treatmentVisitId} IS NULL OR ${t.treatmentVisitId} <> ${t.visitId}`,
    ),
  ],
);

// Optional apartment assignment: the coordinator can request a type before
// accommodation staff allocate an actual apartment.
export const accommodations = pgTable(
  "accommodations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    apartmentType: apartmentType("apartment_type").notNull(),
  },
  (t) => [
    unique("accommodations_id_type_unique").on(t.id, t.apartmentType),
    check("accommodations_name_not_empty", sql`length(trim(${t.name})) > 0`),
  ],
);

// Absence of a row means no accommodation requested. freeDays records a
// partial complimentary stay; remaining days may still be charged.
export const patientAccommodations = pgTable(
  "patient_accommodations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitId: uuid("visit_id")
      .notNull()
      .unique()
      .references(() => patientVisits.id, { onDelete: "cascade" }),
    apartmentType: apartmentType("apartment_type").notNull(),
    accommodationId: uuid("accommodation_id"),
    isFree: boolean("is_free").notNull().default(false),
    freeDays: integer("free_days").notNull().default(0),
  },
  (t) => [
    foreignKey({
      name: "patient_accommodation_requested_type_fk",
      columns: [t.accommodationId, t.apartmentType],
      foreignColumns: [accommodations.id, accommodations.apartmentType],
    }).onDelete("restrict"),
    index("patient_accommodations_apartment_idx").on(t.accommodationId),
    check(
      "patient_accommodations_free_days_valid",
      sql`(${t.isFree} AND ${t.freeDays} > 0) OR (NOT ${t.isFree} AND ${t.freeDays} = 0)`,
    ),
  ],
);

// Absence of a row means no transfer needed. One booking records the agreed
// direction and whether it is complimentary, before scheduling actual trips.
export const patientTransfers = pgTable("patient_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .unique()
    .references(() => patientVisits.id, { onDelete: "cascade" }),
  isFree: boolean("is_free").notNull(),
  direction: transferDirection("direction").notNull(),
});
