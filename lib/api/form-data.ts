export function toForm(data: unknown): FormData {
  const form = new FormData();
  function append(value: unknown, prefix: string) {
    if (value === undefined) return;
    if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) append(child, prefix ? `${prefix}.${key}` : key);
    } else form.set(prefix, typeof value === "boolean" ? (value ? "on" : "") : String(value ?? ""));
  }
  append(data, "");
  // Translate the JSON visit contract to the existing form action contract.
  for (const prefix of ["patient", "companion.visit"]) {
    const visit = prefix === "patient" ? (data as { patient?: Record<string, unknown> }).patient : (data as { companion?: { visit?: Record<string, unknown> } }).companion?.visit;
    if (!visit) continue;
    const accommodation = visit.accommodation as { apartmentType: string; isFree: boolean; freeDays: number } | undefined;
    if (accommodation) {
      form.set(`${prefix}.needsAccommodation`, "on");
      form.set(`${prefix}.apartmentType`, accommodation.apartmentType);
      form.set(`${prefix}.freeAccommodation`, accommodation.isFree ? "on" : "");
      form.set(`${prefix}.freeDays`, String(accommodation.freeDays));
    }
    const transfer = visit.transfer as { direction: string; oneWayLeg: string; isFree: boolean } | undefined;
    if (transfer) {
      form.set(`${prefix}.needsTransfer`, "on");
      form.set(`${prefix}.freeTransfer`, transfer.isFree ? "on" : "");
      form.set(`${prefix}.transferDirection`, transfer.direction);
      form.set(`${prefix}.oneWayLeg`, transfer.oneWayLeg);
    }
  }
  const registration = data as { companion?: { visit?: unknown } };
  if (registration.companion) form.set("hasCompanion", "on");
  if (registration.companion?.visit) form.set("companionTreatment", "on");
  return form;
}
