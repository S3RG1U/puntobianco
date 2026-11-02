"use client";
import {
  useActionState,
  useEffect,
  useRef,
  startTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePatientVisit } from "@/app/(clinic)/patients/actions";
import {
  NameFields,
  VisitFields,
  type Coordinator,
  type VisitDefaults,
} from "@/components/patients/registration-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
import { initialFormState } from "@/lib/patients/form-schema";

export function EditPatientForm({
  id,
  coordinators,
  defaults,
  locked,
  companions,
}: {
  id: string;
  coordinators: Coordinator[];
  defaults: VisitDefaults;
  locked: { treatment: boolean; accommodation: boolean; transfer: boolean };
  companions: { patientId: string; firstName: string; lastName: string }[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, form: FormData) => {
      const result = await updatePatientVisit(previous, form);
      if (result.status === "success") {
        toast.success(t.patients.updated);
        router.push(`/patients/${id}`);
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
      <input type="hidden" name="id" value={id} />
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{state.message}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.patients.editTitle}</CardTitle>
            <CardDescription>{t.patients.editHelp}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <NameFields prefix="patient" errors={errors} defaults={defaults} />
              <VisitFields
                prefix="patient"
                coordinators={coordinators}
                errors={errors}
                defaults={defaults}
                locked={locked}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        {companions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.registration.companionCard}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
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
        )}
      </fieldset>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-background py-4">
        <Button
          nativeButton={false}
          type="button"
          variant="outline"
          disabled={pending}
          render={<Link href={`/patients/${id}`} />}
        >
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? t.registration.saving : t.patients.saveChanges}
        </Button>
      </div>
    </form>
  );
}
