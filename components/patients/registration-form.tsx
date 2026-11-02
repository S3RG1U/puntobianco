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
import { createPatientRegistration } from "@/app/dashboard/patients/actions";
import { apartmentOptions, initialFormState } from "@/lib/patients/form-schema";
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

type Coordinator = { id: string; name: string };
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
function NameFields({
  prefix,
  errors,
}: {
  prefix: string;
  errors: Record<string, string>;
}) {
  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      {(
        [
          ["firstName", "First name"],
          ["lastName", "Last name"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} data-invalid={!!errors[`${prefix}.${key}`]}>
          <FieldLabel htmlFor={`${prefix}.${key}`}>{label}</FieldLabel>
          <Input
            id={`${prefix}.${key}`}
            name={`${prefix}.${key}`}
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
function VisitFields({
  prefix,
  coordinators,
  errors,
}: {
  prefix: string;
  coordinators: Coordinator[];
  errors: Record<string, string>;
}) {
  const [accommodation, setAccommodation] = useState(false);
  const [free, setFree] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [freeTransfer, setFreeTransfer] = useState(false);
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Stay and treatment</FieldLegend>
        <FieldGroup>
          <StayDateRange prefix={prefix} errors={errors} />
          <SelectField
            name={`${prefix}.coordinatorId`}
            label="Responsible coordinator"
            options={coordinators.map((c) => ({ value: c.id, label: c.name }))}
            error={errors[`${prefix}.coordinatorId`]}
          />
          <Field data-invalid={!!errors[`${prefix}.treatment`]}>
            <FieldLabel htmlFor={`${prefix}.treatment`}>
              Planned treatment
            </FieldLabel>
            <Textarea
              id={`${prefix}.treatment`}
              name={`${prefix}.treatment`}
              placeholder="Describe the treatment and any relevant details"
              required
              maxLength={10000}
              aria-invalid={!!errors[`${prefix}.treatment`]}
              aria-describedby={
                errors[`${prefix}.treatment`]
                  ? `${prefix}.treatment-error`
                  : undefined
              }
            />
            {errors[`${prefix}.treatment`] && (
              <FieldError id={`${prefix}.treatment-error`}>
                {errors[`${prefix}.treatment`]}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${prefix}.availabilityNotes`}>
              Availability during the stay{" "}
              <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id={`${prefix}.availabilityNotes`}
              name={`${prefix}.availabilityNotes`}
              placeholder="For example: available in the mornings, unavailable on Friday"
              maxLength={5000}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Accommodation</FieldLegend>
        <FieldDescription>
          Request accommodation now. An apartment can be assigned later.
        </FieldDescription>
        <FieldGroup>
          <Check
            name={`${prefix}.needsAccommodation`}
            checked={accommodation}
            onChange={setAccommodation}
          >
            Accommodation needed
          </Check>
          {accommodation && (
            <>
              <SelectField
                name={`${prefix}.apartmentType`}
                label="Apartment type"
                options={apartmentOptions}
                error={errors[`${prefix}.accommodation.apartmentType`]}
              />
              <Check
                name={`${prefix}.freeAccommodation`}
                checked={free}
                onChange={setFree}
              >
                Include complimentary accommodation days
              </Check>
              {free && (
                <Field
                  data-invalid={!!errors[`${prefix}.accommodation.freeDays`]}
                >
                  <FieldLabel htmlFor={`${prefix}.freeDays`}>
                    Number of complimentary days
                  </FieldLabel>
                  <Input
                    id={`${prefix}.freeDays`}
                    name={`${prefix}.freeDays`}
                    type="number"
                    min={1}
                    max={3650}
                    defaultValue={1}
                    required
                    aria-invalid={!!errors[`${prefix}.accommodation.freeDays`]}
                    aria-describedby={`${prefix}.freeDays-help${errors[`${prefix}.accommodation.freeDays`] ? ` ${prefix}.freeDays-error` : ""}`}
                  />
                  <FieldDescription id={`${prefix}.freeDays-help`}>
                    Other days in the stay are paid.
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
      </FieldSet>
      <FieldSet>
        <FieldLegend>Transfers</FieldLegend>
        <FieldGroup>
          <Check
            name={`${prefix}.needsTransfer`}
            checked={transfer}
            onChange={setTransfer}
          >
            Transfer needed
          </Check>
          {transfer && (
            <>
              <SelectField
                name={`${prefix}.transferDirection`}
                label="Journey"
                defaultValue="round_trip"
                options={[
                  { value: "one_way", label: "One way" },
                  { value: "round_trip", label: "Round trip" },
                ]}
                error={errors[`${prefix}.transfer.direction`]}
              />
              <Check
                name={`${prefix}.freeTransfer`}
                checked={freeTransfer}
                onChange={setFreeTransfer}
              >
                Complimentary transfer
              </Check>
              <FieldDescription>
                {freeTransfer
                  ? "The patient will not be charged for this transfer."
                  : "The transfer is paid."}
              </FieldDescription>
            </>
          )}
        </FieldGroup>
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
  const formRef = useRef<HTMLFormElement>(null);
  const [companion, setCompanion] = useState(false);
  const [treatment, setTreatment] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, form: FormData) => {
      const result = await createPatientRegistration(previous, form);
      if (result.status === "success") {
        toast.success("Patient registration saved.");
        router.push("/dashboard/patients");
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
            No active treatment coordinators are available. Ask an administrator
            to assign the Treatment coordinator role to a staff member.
          </AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient registration</CardTitle>
            <CardDescription>
              Patient details, stay arrangements and planned treatment.
            </CardDescription>
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
            <CardTitle>Accompanying person</CardTitle>
            <CardDescription>
              Add a companion and, if needed, their own treatment registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Check
                name="hasCompanion"
                checked={companion}
                onChange={setCompanion}
              >
                The patient is coming with a companion
              </Check>
              {companion && (
                <>
                  <NameFields prefix="companion" errors={errors} />
                  <Check
                    name="companionTreatment"
                    checked={treatment}
                    onChange={setTreatment}
                  >
                    The companion is also receiving treatment
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
          render={<Link href="/dashboard/patients" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !coordinators.length}>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Saving registration…" : "Save registration"}
        </Button>
      </div>
    </form>
  );
}
