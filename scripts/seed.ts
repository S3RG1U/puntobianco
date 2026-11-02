import { eq } from "drizzle-orm";

import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { treatments, users } from "../lib/db/schema";

const adminEmail = "admin@puntobianco.test";

const treatmentCatalogue: (typeof treatments.$inferInsert)[] = [
  {
    name: "Consultație stomatologică",
    category: "prevention",
    description:
      "Examinare clinică, radiografie panoramică și stabilirea planului de tratament.",
    durationMinutes: 30,
  },
  {
    name: "Detartraj și periaj profesional",
    category: "prevention",
    description:
      "Îndepărtarea tartrului și a plăcii bacteriene, urmată de lustruirea dinților.",
    durationMinutes: 45,
  },
  {
    name: "Obturație din compozit",
    category: "restorative",
    description:
      "Tratarea cariei și refacerea dintelui cu material de culoarea dintelui.",
    durationMinutes: 45,
  },
  {
    name: "Tratament de canal",
    category: "endodontics",
    description:
      "Curățarea, dezinfectarea și sigilarea canalelor radiculare ale dintelui afectat.",
    durationMinutes: 90,
  },
  {
    name: "Extracție dentară",
    category: "surgery",
    description: "Îndepărtarea unui dinte care nu mai poate fi salvat.",
    durationMinutes: 30,
  },
  {
    name: "Extracție molar de minte",
    category: "surgery",
    description:
      "Intervenție chirurgicală pentru molarii de minte incluși sau erupți parțial.",
    durationMinutes: 60,
  },
  {
    name: "Implant dentar",
    category: "implantology",
    description:
      "Inserarea unui implant din titan care înlocuiește rădăcina dintelui lipsă.",
    durationMinutes: 60,
  },
  {
    name: "Adiție osoasă",
    category: "implantology",
    description:
      "Refacerea volumului osos pentru a permite inserarea unui implant.",
    durationMinutes: 90,
  },
  {
    name: "Coroană din zirconiu",
    category: "prosthetics",
    description:
      "Restaurare fixă, rezistentă și estetică, care acoperă întregul dinte.",
    durationMinutes: 60,
  },
  {
    name: "Fațetă ceramică",
    category: "aesthetics",
    description:
      "Corectarea formei și a culorii dinților frontali cu o fațetă subțire din ceramică.",
    durationMinutes: 60,
  },
  {
    name: "Albire dentară profesională",
    category: "aesthetics",
    description: "Deschiderea nuanței dinților în cabinet, sub control medical.",
    durationMinutes: 60,
  },
  {
    name: "Aparat dentar",
    category: "orthodontics",
    description:
      "Consultație și montarea aparatului pentru corectarea poziției dinților.",
    durationMinutes: 60,
  },
  {
    name: "Tratament parodontal",
    category: "periodontics",
    description:
      "Tratarea inflamației gingivale și curățarea în profunzime a pungilor parodontale.",
    durationMinutes: 60,
  },
];

async function seedTreatments() {
  const inserted = await db
    .insert(treatments)
    .values(treatmentCatalogue)
    .onConflictDoNothing({ target: treatments.name })
    .returning({ id: treatments.id });
  console.log(`Added ${inserted.length} treatments`);
}

// Creates the first admin, who adds everyone else from Staff accounts, and the
// starting treatment catalogue.
async function seed() {
  await seedTreatments();

  if (process.env.NODE_ENV === "production") {
    console.log("Skipped the demo admin: not created in production");
    return;
  }

  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error("SEED_PASSWORD must be set. See .env.example.");
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail));

  if (existing.length > 0) {
    console.log(`Skipped ${adminEmail}: already exists`);
    return;
  }

  await auth.api.createUser({
    body: { name: "Admin", email: adminEmail, password, role: "admin" },
  });
  console.log(`Created ${adminEmail}`);
}

seed()
  .then(() => process.exit(0))
  .catch((reason) => {
    console.error(reason);
    process.exit(1);
  });
