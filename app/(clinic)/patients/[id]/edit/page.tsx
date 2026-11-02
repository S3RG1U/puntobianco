import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { EditPatientForm } from "@/components/patients/edit-patient-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  patients,
  patientCompanions,
  patientAccommodations,
  patientTransfers,
  patientVisits,
  users,
} from "@/lib/db/schema";
import { getI18n } from "@/lib/i18n/server";
import { listTreatmentCoordinators } from "@/lib/patients/coordinators";
import { clinicDay, clinicTime } from "@/lib/transfers/calendar";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.patients.editTitle };
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const { id } = await params;
  const roles = parseRoles(user.role);
  if (!can(roles, "patient", "update")) redirect("/patients");
  if (!z.uuid().safeParse(id).success) notFound();
  const [registration] = await db
    .select({
      visit: patientVisits,
      firstName: patients.firstName,
      lastName: patients.lastName,
      coordinator: users.name,
    })
    .from(patientVisits)
    .innerJoin(patients, eq(patients.id, patientVisits.patientId))
    .innerJoin(users, eq(users.id, patientVisits.coordinatorId))
    .where(eq(patientVisits.id, id));
  if (!registration) notFound();
  const [[accommodation], [transfer], active, companions] = await Promise.all([
    db
      .select()
      .from(patientAccommodations)
      .where(eq(patientAccommodations.visitId, id)),
    db.select().from(patientTransfers).where(eq(patientTransfers.visitId, id)),
    listTreatmentCoordinators(),
    db
      .select({
        patientId: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(patientCompanions)
      .innerJoin(patients, eq(patients.id, patientCompanions.patientId))
      .where(
        and(
          eq(patientCompanions.visitId, id),
          isNull(patientCompanions.treatmentVisitId),
        ),
      ),
  ]);
  const { visit } = registration;
  // Keeps the current coordinator selectable even if they are no longer active.
  const coordinators = active.some((c) => c.id === visit.coordinatorId)
    ? active
    : [
        { id: visit.coordinatorId, name: registration.coordinator },
        ...active,
      ];
  return (
    <EditPatientForm
      id={id}
      coordinators={coordinators}
      companions={companions}
      locked={{
        treatment: !can(roles, "treatment", "update"),
        accommodation: !can(roles, "accommodation", "update"),
        transfer: !can(roles, "transfer", "update"),
      }}
      defaults={{
        firstName: registration.firstName,
        lastName: registration.lastName,
        arrivalDate: clinicDay(visit.arrivalAt),
        departureDate: clinicDay(visit.departureAt),
        arrivalTime: clinicTime(visit.arrivalAt),
        departureTime: clinicTime(visit.departureAt),
        coordinatorId: visit.coordinatorId,
        availabilityNotes: visit.availabilityNotes,
        treatment: visit.treatment,
        accommodation,
        transfer,
      }}
    />
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getI18n();
  return (
    <>
      <SiteHeader title={t.patients.editTitle} />
      <div className="mx-auto w-full max-w-4xl p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content params={params} />
        </Suspense>
      </div>
    </>
  );
}
