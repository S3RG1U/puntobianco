"use client";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createPatientRegistration,
  updatePatientVisit,
} from "@/app/(clinic)/patients/actions";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { SelectField } from "@/components/forms/select-field";
import {
  TreatmentSelect,
  type TreatmentOption,
} from "@/components/forms/treatment-select";
import {
  CompanionVisitFields,
  AccommodationDetails,
  Check,
  NameFields,
  TransferDetails,
  type Coordinator,
  type VisitDefaults,
} from "@/components/patients/visit-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import { initialFormState, type FormState } from "@/lib/patients/form-schema";

type CompanionName = { patientId: string; firstName: string; lastName: string };

function tabOfError(key: string) {
  if (key.startsWith("companion")) return "companions";
  if (key.startsWith("patient.accommodation")) return "accommodation";
  if (key.startsWith("patient.transfer")) return "transfer";
  if (key === "patient.treatment") return "treatment";
  return "overview";
}

function Moment({
  moment,
  label,
  value,
  defaultTime,
  error,
}: {
  moment: "arrival" | "departure";
  label: string;
  value: string;
  defaultTime: string;
  error?: string;
}) {
  const id = `patient.${moment}`;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DateTimePicker
        id={id}
        name={id}
        defaultValue={value}
        defaultTime={defaultTime}
        invalid={!!error}
        describedBy={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

type EditProps = {
  id: string;
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
  defaults: VisitDefaults;
  locked: { treatment: boolean; accommodation: boolean; transfer: boolean };
  companions: CompanionName[];
  creating?: boolean;
};

// One form across the tabs: every panel stays mounted, so Save sends them all.
function EditForm({
  id,
  coordinators,
  treatments,
  defaults,
  locked,
  companions,
  onSaved,
  creating = false,
}: EditProps & { onSaved: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const labels = t.registration;
  const tabs = t.patientDetail.tabs;
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companionTreatment, setCompanionTreatment] = useState(false);
  const [tab, setTab] = useState("overview");
  const [accommodation, setAccommodation] = useState(!!defaults.accommodation);
  const [transfer, setTransfer] = useState(!!defaults.transfer);
  const [state, action, pending] = useActionState(
    async (previous: FormState, form: FormData) => {
      const result = await (
        creating ? createPatientRegistration : updatePatientVisit
      )(previous, form);
      const firstError = Object.keys(result.errors ?? {})[0];
      if (firstError) setTab(tabOfError(firstError));
      return result;
    },
    initialFormState,
  );
  const errors = state.errors ?? {};
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(creating ? labels.saved : t.patients.updated);
    router.push(creating ? "/patients" : `/patients/${id}`);
    onSaved();
  }, [state, id, router, t, onSaved, creating, labels.saved]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {locked.treatment && (
        <input
          type="hidden"
          name="patient.treatment"
          value={defaults.treatment}
        />
      )}
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{state.message}</AlertDescription>
        </Alert>
      )}
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="overview">{tabs.overview}</TabsTrigger>
          {!locked.treatment && (
            <TabsTrigger value="treatment">{tabs.treatment}</TabsTrigger>
          )}
          {!locked.accommodation && (
            <TabsTrigger value="accommodation">
              {tabs.accommodation}
            </TabsTrigger>
          )}
          {!locked.transfer && (
            <TabsTrigger value="transfer">{tabs.transfer}</TabsTrigger>
          )}
          {(creating || companions.length > 0) && (
            <TabsTrigger value="companions">{tabs.companions}</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview" keepMounted>
          <Card>
            <CardHeader>
              <CardTitle>{t.patientDetail.stay}</CardTitle>
              <CardDescription>
                {creating ? labels.steps.clinicTime : t.patients.editHelp}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <NameFields
                  prefix="patient"
                  errors={errors}
                  defaults={defaults}
                />
                <Moment
                  moment="arrival"
                  label={t.common.arrival}
                  value={
                    defaults.arrivalDate
                      ? `${defaults.arrivalDate}T${defaults.arrivalTime}`
                      : ""
                  }
                  defaultTime="09:00"
                  error={
                    errors["patient.arrivalDate"] ??
                    errors["patient.arrivalTime"]
                  }
                />
                <Moment
                  moment="departure"
                  label={t.common.departure}
                  value={
                    defaults.departureDate
                      ? `${defaults.departureDate}T${defaults.departureTime}`
                      : ""
                  }
                  defaultTime="18:00"
                  error={
                    errors["patient.departureDate"] ??
                    errors["patient.departureTime"]
                  }
                />
                <SelectField
                  name="patient.coordinatorId"
                  label={labels.responsibleCoordinator}
                  defaultValue={defaults.coordinatorId}
                  options={coordinators.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  error={errors["patient.coordinatorId"]}
                />
                <Field>
                  <FieldLabel htmlFor="patient.availabilityNotes">
                    {labels.availability}{" "}
                    <span className="text-muted-foreground">
                      {labels.optional}
                    </span>
                  </FieldLabel>
                  <Textarea
                    id="patient.availabilityNotes"
                    name="patient.availabilityNotes"
                    defaultValue={defaults.availabilityNotes}
                    placeholder={labels.availabilityPlaceholder}
                    maxLength={5000}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>
        {!locked.treatment && (
          <TabsContent value="treatment" keepMounted>
            <Card>
              <CardHeader>
                <CardTitle>{labels.plannedTreatment}</CardTitle>
                <CardDescription>{labels.treatmentHelp}</CardDescription>
              </CardHeader>
              <CardContent>
                <Field data-invalid={!!errors["patient.treatment"]}>
                  <FieldLabel
                    htmlFor="patient.treatment-search"
                    className="sr-only"
                  >
                    {labels.plannedTreatment}
                  </FieldLabel>
                  <TreatmentSelect
                    id="patient.treatment-search"
                    name="patient.treatment"
                    options={treatments}
                    defaultValue={defaults.treatment}
                    invalid={!!errors["patient.treatment"]}
                  />
                  {errors["patient.treatment"] && (
                    <FieldError>{errors["patient.treatment"]}</FieldError>
                  )}
                </Field>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {!locked.accommodation && (
          <TabsContent value="accommodation" keepMounted>
            <Card>
              <CardHeader>
                <CardTitle>{labels.accommodation}</CardTitle>
                <CardDescription>{labels.accommodationHelp}</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Check
                    name="patient.needsAccommodation"
                    checked={accommodation}
                    onChange={setAccommodation}
                  >
                    {labels.accommodationNeeded}
                  </Check>
                  {accommodation && (
                    <AccommodationDetails
                      prefix="patient"
                      errors={errors}
                      defaults={defaults}
                    />
                  )}
                </FieldGroup>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {!locked.transfer && (
          <TabsContent value="transfer" keepMounted>
            <Card>
              <CardHeader>
                <CardTitle>{labels.transfers}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Check
                    name="patient.needsTransfer"
                    checked={transfer}
                    onChange={setTransfer}
                  >
                    {labels.transferNeeded}
                  </Check>
                  {transfer && (
                    <TransferDetails
                      prefix="patient"
                      errors={errors}
                      defaults={defaults}
                    />
                  )}
                </FieldGroup>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {(creating || companions.length > 0) && (
          <TabsContent value="companions" keepMounted>
            <Card>
              <CardHeader>
                <CardTitle>{t.patientDetail.companions}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {creating && (
                    <>
                      <Check
                        name="hasCompanion"
                        checked={hasCompanion}
                        onChange={setHasCompanion}
                      >
                        {labels.companionHelp}
                      </Check>
                      {hasCompanion && (
                        <>
                          <NameFields prefix="companion" errors={errors} />
                          <Check
                            name="companionTreatment"
                            checked={companionTreatment}
                            onChange={setCompanionTreatment}
                          >
                            {labels.companionTreated}
                          </Check>
                          {companionTreatment && (
                            <CompanionVisitFields
                              prefix="companion.visit"
                              coordinators={coordinators}
                              treatments={treatments}
                              errors={errors}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
                  {companions.map(({ patientId, firstName, lastName }) => (
                    <NameFields
                      key={patientId}
                      prefix={`companions.${patientId}`}
                      errors={errors}
                      defaults={{ firstName, lastName }}
                    />
                  ))}
                </FieldGroup>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      <div className="flex justify-end gap-2">
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link href={creating ? "/patients" : `/patients/${id}`} />}
        >
          {t.common.cancel}
        </Button>
        <Button
          type="submit"
          disabled={pending || (creating && !coordinators.length)}
        >
          {pending && <Spinner data-icon="inline-start" />}
          {pending
            ? labels.saving
            : creating
              ? labels.save
              : t.patients.saveChanges}
        </Button>
      </div>
    </form>
  );
}

// Next keeps a visited page alive while hidden, so after a save the form starts
// over from the saved data, or coming back would repeat the save message.
export function EditPatientForm(props: EditProps) {
  const [saves, setSaves] = useState(0);
  const onSaved = useCallback(() => setSaves((count) => count + 1), []);
  return <EditForm key={saves} {...props} onSaved={onSaved} />;
}

export function RegistrationForm({
  coordinators,
  treatments,
}: {
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
}) {
  return (
    <EditPatientForm
      id=""
      creating
      coordinators={coordinators}
      treatments={treatments}
      companions={[]}
      locked={{ treatment: false, accommodation: false, transfer: false }}
      defaults={{
        firstName: "",
        lastName: "",
        arrivalDate: "",
        departureDate: "",
        arrivalTime: "",
        departureTime: "",
        coordinatorId: "",
        availabilityNotes: "",
        treatment: "",
      }}
    />
  );
}
