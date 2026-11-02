"use client";
import { useState, type ReactNode } from "react";
import { SelectField } from "@/components/forms/select-field";
import { StayDateRange } from "@/components/forms/stay-date-range";
import {
  TreatmentSelect,
  type TreatmentOption,
} from "@/components/forms/treatment-select";
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
import { useI18n } from "@/lib/i18n/client";
import { apartmentValues } from "@/lib/patients/form-schema";

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
type Errors = Record<string, string>;

export function Check({
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
  errors: Errors;
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

function CareFields({
  prefix,
  coordinators,
  treatments,
  errors,
}: {
  prefix: string;
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
  errors: Errors;
}) {
  const { t } = useI18n();
  const labels = t.registration;
  return (
    <FieldGroup>
      <SelectField
        name={`${prefix}.coordinatorId`}
        label={labels.responsibleCoordinator}
        options={coordinators.map((c) => ({ value: c.id, label: c.name }))}
        error={errors[`${prefix}.coordinatorId`]}
      />
      <Field data-invalid={!!errors[`${prefix}.treatment`]}>
        <FieldLabel htmlFor={`${prefix}.treatment-search`}>
          {labels.plannedTreatment}
        </FieldLabel>
        <TreatmentSelect
          id={`${prefix}.treatment-search`}
          name={`${prefix}.treatment`}
          options={treatments}
          invalid={!!errors[`${prefix}.treatment`]}
          describedBy={
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
          {labels.availability}{" "}
          <span className="text-muted-foreground">{labels.optional}</span>
        </FieldLabel>
        <Textarea
          id={`${prefix}.availabilityNotes`}
          name={`${prefix}.availabilityNotes`}
          placeholder={labels.availabilityPlaceholder}
          maxLength={5000}
        />
      </Field>
    </FieldGroup>
  );
}

// Shown once accommodation is requested.
export function AccommodationDetails({
  prefix,
  errors,
  defaults,
}: {
  prefix: string;
  errors: Errors;
  defaults?: VisitDefaults;
}) {
  const { t } = useI18n();
  const labels = t.registration;
  const [free, setFree] = useState(defaults?.accommodation?.isFree ?? false);
  return (
    <FieldGroup>
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
        <Field data-invalid={!!errors[`${prefix}.accommodation.freeDays`]}>
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
    </FieldGroup>
  );
}

// Shown once a transfer is requested.
export function TransferDetails({
  prefix,
  errors,
  defaults,
}: {
  prefix: string;
  errors: Errors;
  defaults?: VisitDefaults;
}) {
  const { t } = useI18n();
  const labels = t.registration;
  const [free, setFree] = useState(defaults?.transfer?.isFree ?? false);
  const [direction, setDirection] = useState(
    defaults?.transfer?.direction ?? "round_trip",
  );
  return (
    <FieldGroup>
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
      <Check name={`${prefix}.freeTransfer`} checked={free} onChange={setFree}>
        {labels.freeTransfer}
      </Check>
      <FieldDescription>
        {free ? labels.freeTransferHelp : labels.paidTransferHelp}
      </FieldDescription>
    </FieldGroup>
  );
}

// A companion's own treatment visit: one question with every visit field.
export function CompanionVisitFields({
  prefix,
  coordinators,
  treatments,
  errors,
}: {
  prefix: string;
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
  errors: Errors;
}) {
  const { t } = useI18n();
  const labels = t.registration;
  const [accommodation, setAccommodation] = useState(false);
  const [transfer, setTransfer] = useState(false);
  return (
    <FieldGroup>
      <StayDateRange prefix={prefix} errors={errors} />
      <CareFields
        prefix={prefix}
        coordinators={coordinators}
        treatments={treatments}
        errors={errors}
      />
      <FieldSet>
        <FieldLegend>{labels.accommodation}</FieldLegend>
        <Check
          name={`${prefix}.needsAccommodation`}
          checked={accommodation}
          onChange={setAccommodation}
        >
          {labels.accommodationNeeded}
        </Check>
        {accommodation && <AccommodationDetails prefix={prefix} errors={errors} />}
      </FieldSet>
      <FieldSet>
        <FieldLegend>{labels.transfers}</FieldLegend>
        <Check
          name={`${prefix}.needsTransfer`}
          checked={transfer}
          onChange={setTransfer}
        >
          {labels.transferNeeded}
        </Check>
        {transfer && <TransferDetails prefix={prefix} errors={errors} />}
      </FieldSet>
    </FieldGroup>
  );
}
