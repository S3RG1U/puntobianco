import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import {
  ApartmentAvailability,
  ApartmentAddressForm,
} from "@/components/accommodations/apartment-details";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import {
  accommodations,
  patientAccommodations,
  patientVisits,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { getI18n } from "@/lib/i18n/server";
import { clinicDay } from "@/lib/transfers/calendar";

const clinicAddress = "31 August 1989 St 33A, Chișinău, Republica Moldova";
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const roles = parseRoles(user.role);
  if (!can(roles, "accommodation", "read")) redirect("/dashboard");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { t } = await getI18n();
  const [apartment] = await db
    .select()
    .from(accommodations)
    .where(eq(accommodations.id, id));
  if (!apartment) notFound();
  const reservations = await db
    .select({
      id: patientAccommodations.id,
      arrival: patientVisits.arrivalAt,
      departure: patientVisits.departureAt,
    })
    .from(patientAccommodations)
    .innerJoin(
      patientVisits,
      eq(patientVisits.id, patientAccommodations.visitId),
    )
    .where(eq(patientAccommodations.accommodationId, id))
    .orderBy(asc(patientVisits.arrivalAt));
  const directions = `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: apartment.address, destination: clinicAddress, travelmode: "driving" })}`;
  return (
    <div className="flex flex-col gap-6">
      <Button
        nativeButton={false}
        variant="outline"
        className="self-start"
        render={<Link href="/accommodations" />}
      >
        {t.accommodations.title}
      </Button>
      <div>
        <h2 className="text-2xl font-semibold">{apartment.name}</h2>
        <p className="text-muted-foreground">
          {t.apartmentTypes[apartment.apartmentType]}
        </p>
      </div>
      <ApartmentAvailability
        today={clinicDay(new Date())}
        reservations={reservations.map((r) => ({
          id: r.id,
          arrival: r.arrival.toISOString(),
          departure: r.departure.toISOString(),
          firstDay: clinicDay(r.arrival),
          lastDay: clinicDay(new Date(r.departure.getTime() - 1)),
        }))}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t.accommodations.location}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {can(roles, "accommodation", "update") ? (
            <ApartmentAddressForm id={id} address={apartment.address} />
          ) : (
            <p>{apartment.address}</p>
          )}
          {apartment.address ? (
            <>
              <iframe
                title={`${t.accommodations.location}: ${apartment.name}`}
                src={`https://www.google.com/maps?${new URLSearchParams({ q: apartment.address, output: "embed" })}`}
                className="h-96 w-full rounded-lg border"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              <p className="text-sm text-muted-foreground">
                Punto Bianco · {clinicAddress}
              </p>
              <Button
                nativeButton={false}
                className="self-start"
                render={
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {t.accommodations.directions}
              </Button>
            </>
          ) : (
            <p>{t.accommodations.missingAddress}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader title="accommodations" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content {...props} />
        </Suspense>
      </PageContent>
    </>
  );
}
