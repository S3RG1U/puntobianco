"use client";
import {
  useActionState,
  useState,
  useEffect,
  useRef,
  startTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPatientRegistration } from "@/app/(clinic)/patients/actions";
import { useI18n } from "@/lib/i18n/client";
import { apartmentValues, initialFormState } from "@/lib/patients/form-schema";
import { SelectField } from "@/components/forms/select-field";
import { StayDateRange } from "@/components/forms/stay-date-range";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type Coordinator = { id: string; name: string };
// Existing values when the fields are used to edit a registration.
export type VisitDefaults = {
  firstName: string;
  lastName: string;
  arrivalDate: string;
  departureDate: string;
  arrivalTime: string;
  departureTime: string;
  coordinatorId: string;
  availabilityNotes: string;
  treatment: string;
  accommodation?: { apartmentType: string; isFree: boolean; freeDays: number };
  transfer?: { isFree: boolean; direction: string; oneWayLeg: string };
};
function Check({
  name,
  children,
  checked,
  onChange,
}: {
  name: string;
  children: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={name}
        name={name}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <FieldLabel htmlFor={name}>{children}</FieldLabel>
    </Field>
  );
}
export function NameFields({
  prefix,
  errors,
  defaults,
}: {
  prefix: string;
  errors: Record<string, string>;
  defaults?: { firstName: string; lastName: string };
}) {
  const { t } = useI18n();
  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      {(
        [
          ["firstName", t.registration.firstName],
          ["lastName", t.registration.lastName],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} data-invalid={!!errors[`${prefix}.${key}`]}>
          <FieldLabel htmlFor={`${prefix}.${key}`}>{label}</FieldLabel>
          <Input
            id={`${prefix}.${key}`}
            name={`${prefix}.${key}`}
            defaultValue={defaults?.[key]}
            required
            maxLength={200}
            autoComplete="off"
            aria-invalid={!!errors[`${prefix}.${key}`]}
            aria-describedby={
              errors[`${prefix}.${key}`] ? `${prefix}.${key}-error` : undefined
            }
          />
          {errors[`${prefix}.${key}`] && (
            <FieldError id={`${prefix}.${key}-error`}>
              {errors[`${prefix}.${key}`]}
            </FieldError>
          )}
        </Field>
      ))}
    </FieldGroup>
  );
}
export function VisitFields({
  prefix,
  coordinators,
  errors,
  defaults,
  locked,
}: {
  prefix: string;
  coordinators: Coordinator[];
  errors: Record<string, string>;
  defaults?: VisitDefaults;
  // Sections this role may see but not change.
  locked?: { treatment: boolean; accommodation: boolean; transfer: boolean };
}) {
  const { t } = useI18n();
  const labels = t.registration;
  const [accommodation, setAccommodation] = useState(!!defaults?.accommodation);
  const [free, setFree] = useState(defaults?.accommodation?.isFree ?? false);
  const [transfer, setTransfer] = useState(!!defaults?.transfer);
  const [freeTransfer, setFreeTransfer] = useState(
    defaults?.transfer?.isFree ?? false,
  );
  const [direction, setDirection] = useState(
    defaults?.transfer?.direction ?? "round_trip",
  );
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>{labels.stayAndTreatment}</FieldLegend>
        <FieldGroup>
          <StayDateRange prefix={prefix} errors={errors} defaults={defaults} />
          <SelectField
            name={`${prefix}.coordinatorId`}
            label={labels.responsibleCoordinator}
            options={coordinators.map((c) => ({ value: c.id, label: c.name }))}
            defaultValue={defaults?.coordinatorId}
            error={errors[`${prefix}.coordinatorId`]}
          />
          <Field data-invalid={!!errors[`${prefix}.treatment`]}>
            <FieldLabel htmlFor={`${prefix}.treatment`}>
              {labels.plannedTreatment}
            </FieldLabel>
            <Textarea
              id={`${prefix}.treatment`}
              name={`${prefix}.treatment`}
              defaultValue={defaults?.treatment}
              readOnly={locked?.treatment}
              placeholder={labels.treatmentPlaceholder}
              required
              maxLength={10000}
              aria-invalid={!!errors[`${prefix}.treatment`]}
              aria-describedby={
                errors[`${prefix}.treatment`]
                  ? `${prefix}.treatment-error`
                  : undefined
              }
            />
            {locked?.treatment && (
              <FieldDescription>{t.patients.lockedSection}</FieldDescription>
            )}
            {errors[`${prefix}.treatment`] && (
              <FieldError id={`${prefix}.treatment-error`}>
                {errors[`${prefix}.treatment`]}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${prefix}.availabilityNotes`}>
              {labels.availability}{" "}
              <span className="text-muted-foreground">{labels.optional}</span>
            </FieldLabel>
            <Textarea
              id={`${prefix}.availabilityNotes`}
              name={`${prefix}.availabilityNotes`}
              defaultValue={defaults?.availabilityNotes}
              placeholder={labels.availabilityPlaceholder}
              maxLength={5000}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>{labels.accommodation}</FieldLegend>
        {locked?.accommodation ? (
          <FieldDescription>{t.patients.lockedSection}</FieldDescription>
        ) : (
          <>
        <FieldDescription>
          {labels.accommodationHelp}
        </FieldDescription>
        <FieldGroup>
          <Check
            name={`${prefix}.needsAccommodation`}
            checked={accommodation}
            onChange={setAccommodation}
          >
            {labels.accommodationNeeded}
          </Check>
          {accommodation && (
            <>
              <SelectField
                name={`${prefix}.apartmentType`}
                label={labels.apartmentType}
                defaultValue={defaults?.accommodation?.apartmentType}
                options={apartmentValues.map((value) => ({
                  value,
                  label: t.apartmentTypes[value],
                }))}
                error={errors[`${prefix}.accommodation.apartmentType`]}
              />
              <Check
                name={`${prefix}.freeAccommodation`}
                checked={free}
                onChange={setFree}
              >
                {labels.includeFreeDays}
              </Check>
              {free && (
                <Field
                  data-invalid={!!errors[`${prefix}.accommodation.freeDays`]}
                >
                  <FieldLabel htmlFor={`${prefix}.freeDays`}>
                    {labels.freeDaysCount}
                  </FieldLabel>
                  <Input
                    id={`${prefix}.freeDays`}
                    name={`${prefix}.freeDays`}
                    type="number"
                    min={1}
                    max={3650}
                    defaultValue={defaults?.accommodation?.freeDays || 1}
                    required
                    aria-invalid={!!errors[`${prefix}.accommodation.freeDays`]}
                    aria-describedby={`${prefix}.freeDays-help${errors[`${prefix}.accommodation.freeDays`] ? ` ${prefix}.freeDays-error` : ""}`}
                  />
                  <FieldDescription id={`${prefix}.freeDays-help`}>
                    {labels.freeDaysHelp}
                  </FieldDescription>
                  {errors[`${prefix}.accommodation.freeDays`] && (
                    <FieldError id={`${prefix}.freeDays-error`}>
                      {errors[`${prefix}.accommodation.freeDays`]}
                    </FieldError>
                  )}
                </Field>
              )}
            </>
          )}
        </FieldGroup>
          </>
        )}
      </FieldSet>
      <FieldSet>
        <FieldLegend>{labels.transfers}</FieldLegend>
        {locked?.transfer ? (
          <FieldDescription>{t.patients.lockedSection}</FieldDescription>
        ) : (
        <FieldGroup>
          <Check
            name={`${prefix}.needsTransfer`}
            checked={transfer}
            onChange={setTransfer}
          >
            {labels.transferNeeded}
          </Check>
          {transfer && (
            <>
              <SelectField
                name={`${prefix}.transferDirection`}
                label={labels.journey}
                defaultValue={direction}
                onValueChange={setDirection}
                options={[
                  { value: "one_way", label: labels.oneWay },
                  { value: "round_trip", label: labels.roundTrip },
                ]}
                error={errors[`${prefix}.transfer.direction`]}
              />
              {direction === "one_way" && (
                <SelectField
                  name={`${prefix}.oneWayLeg`}
                  label={labels.leg}
                  defaultValue={defaults?.transfer?.oneWayLeg ?? "arrival"}
                  options={[
                    { value: "arrival", label: t.common.arrival },
                    { value: "departure", label: t.common.departure },
                  ]}
                  error={errors[`${prefix}.transfer.oneWayLeg`]}
                />
              )}
              <Check
                name={`${prefix}.freeTransfer`}
                checked={freeTransfer}
                onChange={setFreeTransfer}
              >
                {labels.freeTransfer}
              </Check>
              <FieldDescription>
                {freeTransfer
                  ? labels.freeTransferHelp
                  : labels.paidTransferHelp}
              </FieldDescription>
            </>
          )}
        </FieldGroup>
        )}
      </FieldSet>
    </FieldGroup>
  );
}
export function RegistrationForm({
  coordinators,
}: {
  coordinators: Coordinator[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const labels = t.registration;
  const formRef = useRef<HTMLFormElement>(null);
  const [companion, setCompanion] = useState(false);
  const [treatment, setTreatment] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, form: FormData) => {
      const result = await createPatientRegistration(previous, form);
      if (result.status === "success") {
        toast.success(labels.saved);
        router.push("/patients");
        router.refresh();
      }
      return result;
    },
    initialFormState,
  );
  const errors = state.errors ?? {};
  useEffect(() => {
    if (state.status === "error")
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [state]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }
  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6"
    >
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{state.message}</AlertDescription>
        </Alert>
      )}
      {!coordinators.length && (
        <Alert>
          <AlertDescription>
            {labels.noCoordinators}
          </AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{labels.card}</CardTitle>
            <CardDescription>{labels.cardHelp}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <NameFields prefix="patient" errors={errors} />
              <VisitFields
                prefix="patient"
                coordinators={coordinators}
                errors={errors}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{labels.companionCard}</CardTitle>
            <CardDescription>{labels.companionHelp}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Check
                name="hasCompanion"
                checked={companion}
                onChange={setCompanion}
              >
                {labels.hasCompanion}
              </Check>
              {companion && (
                <>
                  <NameFields prefix="companion" errors={errors} />
                  <Check
                    name="companionTreatment"
                    checked={treatment}
                    onChange={setTreatment}
                  >
                    {labels.companionTreated}
                  </Check>
                  {treatment && (
                    <VisitFields
                      prefix="companion.visit"
                      coordinators={coordinators}
                      errors={errors}
                    />
                  )}
                </>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      </fieldset>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-4">
        <Button
          nativeButton={false}
          type="button"
          variant="outline"
          disabled={pending}
          render={<Link href="/patients" />}
        >
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending || !coordinators.length}>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? labels.saving : labels.save}
        </Button>
      </div>
    </form>
  );
}
