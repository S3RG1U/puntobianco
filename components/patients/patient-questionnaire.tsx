"use client";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  startTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPatientRegistration } from "@/app/(clinic)/patients/actions";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import {
  TreatmentSelect,
  type TreatmentOption,
} from "@/components/forms/treatment-select";
import {
  AccommodationDetails,
  Check,
  CompanionVisitFields,
  NameFields,
  TransferDetails,
  type Coordinator,
} from "@/components/patients/visit-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
import { initialFormState, type FormState } from "@/lib/patients/form-schema";

const field = (name: string) => `patient.${name}`;
const NEEDS_ACCOMMODATION = field("needsAccommodation");
const NEEDS_TRANSFER = field("needsTransfer");
const HAS_COMPANION = "hasCompanion";

type Errors = Record<string, string>;

// Which question a server validation error belongs to.
function questionOfError(key: string) {
  if (key.startsWith("companion")) return HAS_COMPANION;
  if (key === field("arrivalDate") || key === field("arrivalTime"))
    return field("arrival");
  if (key === field("departureDate") || key === field("departureTime"))
    return field("departure");
  if (key.startsWith(field("accommodation"))) return NEEDS_ACCOMMODATION;
  if (key.startsWith(field("transfer"))) return NEEDS_TRANSFER;
  return key;
}

function errorForQuestion(errors: Errors, name: string) {
  return Object.entries(errors).find(
    ([key]) => questionOfError(key) === name,
  )?.[1];
}

// A server error stops counting once the answer changes, or Next stays blocked.
function useQuestionError(name: string, errors: Errors) {
  const [editedSince, setEditedSince] = useState<Errors>();
  return {
    error: editedSince === errors ? undefined : errorForQuestion(errors, name),
    markEdited: () => setEditedSince(errors),
  };
}

function InputQuestion({
  name,
  title,
  description,
  errors,
  multiline,
  optional,
}: {
  name: string;
  title: string;
  description?: string;
  errors: Errors;
  multiline?: boolean;
  optional?: boolean;
}) {
  const { t } = useI18n();
  const { error, markEdited } = useQuestionError(name, errors);
  const [value, setValue] = useState("");
  return (
    <QuestionnaireItem name={name} required={!optional} invalid={!!error}>
      <QuestionnaireTitle>{title}</QuestionnaireTitle>
      {description && (
        <QuestionnaireDescription>{description}</QuestionnaireDescription>
      )}
      <QuestionnaireChoices>
        <QuestionnaireInput
          aria-label={title}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            markEdited();
          }}
          className={multiline ? "h-auto py-2" : undefined}
          render={multiline ? <textarea rows={4} /> : undefined}
        />
      </QuestionnaireChoices>
      <QuestionnaireError>
        {error ?? t.registration.answerRequired}
      </QuestionnaireError>
    </QuestionnaireItem>
  );
}

// A question answered by a shadcn control. The questionnaire only counts its
// own inputs as answers, so a hidden one carries the value and submits it.
function ControlQuestion({
  name,
  title,
  description,
  errors,
  control,
}: {
  name: string;
  title: string;
  description?: string;
  errors: Errors;
  control: (props: {
    invalid: boolean;
    onChange: (value: string) => void;
  }) => ReactNode;
}) {
  const { t } = useI18n();
  const { error, markEdited } = useQuestionError(name, errors);
  const [value, setValue] = useState("");
  return (
    <QuestionnaireItem name={name} required invalid={!!error}>
      <QuestionnaireTitle>{title}</QuestionnaireTitle>
      {description && (
        <QuestionnaireDescription>{description}</QuestionnaireDescription>
      )}
      <QuestionnaireChoices>
        {/* A textarea, because a text input would drop the treatments' line breaks. */}
        <QuestionnaireInput hidden readOnly value={value} render={<textarea />} />
        {control({
          invalid: !!error,
          onChange: (next) => {
            setValue(next);
            markEdited();
          },
        })}
      </QuestionnaireChoices>
      <QuestionnaireError>
        {error ?? t.registration.answerRequired}
      </QuestionnaireError>
    </QuestionnaireItem>
  );
}

// A yes/no question whose follow-up fields appear after "yes". The answer is
// submitted under the question's name, as "on" when it is yes.
function YesNoQuestion({
  name,
  title,
  description,
  yes,
  no,
  children,
}: {
  name: string;
  title: string;
  description?: string;
  yes: string;
  no: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState<boolean>();
  return (
    <QuestionnaireItem name={name} required>
      <QuestionnaireTitle>{title}</QuestionnaireTitle>
      {description && (
        <QuestionnaireDescription>{description}</QuestionnaireDescription>
      )}
      <QuestionnaireChoices>
        <QuestionnaireChoice value="on" onChange={() => setAnswer(true)}>
          {yes}
        </QuestionnaireChoice>
        <QuestionnaireChoice value="no" onChange={() => setAnswer(false)}>
          {no}
        </QuestionnaireChoice>
      </QuestionnaireChoices>
      {answer && children}
      <QuestionnaireError>{t.registration.answerRequired}</QuestionnaireError>
    </QuestionnaireItem>
  );
}

function CompanionQuestion({
  coordinators,
  treatments,
  errors,
}: {
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
  errors: Errors;
}) {
  const { t } = useI18n();
  const labels = t.registration;
  const [treated, setTreated] = useState(false);
  return (
    <YesNoQuestion
      name={HAS_COMPANION}
      title={labels.steps.companion.title}
      description={labels.companionHelp}
      yes={labels.steps.companion.yes}
      no={labels.steps.companion.no}
    >
      <FieldGroup>
        <NameFields prefix="companion" errors={errors} />
        <Check
          name="companionTreatment"
          checked={treated}
          onChange={setTreated}
        >
          {labels.companionTreated}
        </Check>
        {treated && (
          <CompanionVisitFields
            prefix="companion.visit"
            coordinators={coordinators}
            treatments={treatments}
            errors={errors}
          />
        )}
      </FieldGroup>
    </YesNoQuestion>
  );
}

function RegistrationQuestionnaire({
  coordinators,
  treatments,
  onSaved,
}: {
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const labels = t.registration;
  const steps = labels.steps;
  const [question, setQuestion] = useState(field("firstName"));
  const [state, action, pending] = useActionState(
    async (previous: FormState, form: FormData) => {
      const result = await createPatientRegistration(previous, form);
      const firstError = Object.keys(result.errors ?? {})[0];
      if (firstError) setQuestion(questionOfError(firstError));
      return result;
    },
    initialFormState,
  );
  const errors = state.errors ?? {};
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(labels.saved);
    router.push("/patients");
    onSaved();
  }, [state, labels.saved, router, onSaved]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }
  const coordinatorName = field("coordinatorId");
  const items = [
    { name: field("firstName"), required: true },
    { name: field("lastName"), required: true },
    { name: field("arrival"), required: true },
    { name: field("departure"), required: true },
    { name: coordinatorName, required: true },
    { name: field("treatment"), required: true },
    { name: field("availabilityNotes"), required: false },
    { name: NEEDS_ACCOMMODATION, required: true },
    { name: NEEDS_TRANSFER, required: true },
    { name: HAS_COMPANION, required: true },
  ];
  return (
    <div className="flex flex-col gap-4">
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{state.message}</AlertDescription>
        </Alert>
      )}
      {!coordinators.length && (
        <Alert>
          <AlertDescription>{labels.noCoordinators}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <Questionnaire
            items={items}
            item={question}
            onItemChange={setQuestion}
            onSubmit={submit}
          >
            <QuestionnaireProgress
              aria-label={labels.progressLabel}
              render={(props, progress) => (
                <div {...props} aria-valuetext={undefined}>
                  {labels.progress(progress.current, progress.total)}
                </div>
              )}
            />
            <InputQuestion
              name={field("firstName")}
              title={steps.firstName.title}
              description={steps.firstName.description}
              errors={errors}
            />
            <InputQuestion
              name={field("lastName")}
              title={steps.lastName.title}
              errors={errors}
            />
            <ControlQuestion
              name={field("arrival")}
              title={steps.arrival.title}
              description={steps.clinicTime}
              errors={errors}
              control={(props) => <DateTimePicker defaultTime="09:00" {...props} />}
            />
            <ControlQuestion
              name={field("departure")}
              title={steps.departure.title}
              description={steps.clinicTime}
              errors={errors}
              control={(props) => <DateTimePicker defaultTime="18:00" {...props} />}
            />
            <QuestionnaireItem name={coordinatorName} required>
              <QuestionnaireTitle>{steps.coordinator.title}</QuestionnaireTitle>
              <QuestionnaireChoices>
                {coordinators.map(({ id, name }) => (
                  <QuestionnaireChoice key={id} value={id}>
                    {name}
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
              <QuestionnaireError>{labels.answerRequired}</QuestionnaireError>
            </QuestionnaireItem>
            <ControlQuestion
              name={field("treatment")}
              title={steps.treatment.title}
              description={labels.treatmentHelp}
              errors={errors}
              control={(props) => <TreatmentSelect options={treatments} {...props} />}
            />
            <InputQuestion
              name={field("availabilityNotes")}
              title={steps.availability.title}
              description={labels.availabilityPlaceholder}
              errors={errors}
              multiline
              optional
            />
            <YesNoQuestion
              name={NEEDS_ACCOMMODATION}
              title={steps.accommodation.title}
              description={labels.accommodationHelp}
              yes={steps.accommodation.yes}
              no={steps.accommodation.no}
            >
              <AccommodationDetails prefix="patient" errors={errors} />
            </YesNoQuestion>
            <YesNoQuestion
              name={NEEDS_TRANSFER}
              title={steps.transfer.title}
              yes={steps.transfer.yes}
              no={steps.transfer.no}
            >
              <TransferDetails prefix="patient" errors={errors} />
            </YesNoQuestion>
            <CompanionQuestion
              coordinators={coordinators}
              treatments={treatments}
              errors={errors}
            />
            <QuestionnaireActions>
              <QuestionnairePrevious>{t.common.previous}</QuestionnairePrevious>
              <QuestionnaireSkip>{labels.skip}</QuestionnaireSkip>
              <QuestionnaireNext>{t.common.next}</QuestionnaireNext>
              <QuestionnaireSubmit disabled={pending || !coordinators.length}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? labels.saving : labels.save}
              </QuestionnaireSubmit>
            </QuestionnaireActions>
          </Questionnaire>
        </CardContent>
      </Card>
      <Button
        nativeButton={false}
        variant="ghost"
        className="self-end"
        render={<Link href="/patients" />}
      >
        {t.common.cancel}
      </Button>
    </div>
  );
}

// Next keeps a visited page alive while hidden, so after a save the form starts
// over, or coming back would show the old answers and save message.
export function RegistrationForm(props: {
  coordinators: Coordinator[];
  treatments: TreatmentOption[];
}) {
  const [saves, setSaves] = useState(0);
  const onSaved = useCallback(() => setSaves((count) => count + 1), []);
  return <RegistrationQuestionnaire key={saves} {...props} onSaved={onSaved} />;
}
