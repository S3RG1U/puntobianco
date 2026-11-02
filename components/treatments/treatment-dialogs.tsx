"use client";
import {
  useActionState,
  useState,
  startTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import {
  createTreatment,
  updateTreatment,
} from "@/app/(clinic)/treatments/actions";
import { SelectField } from "@/components/forms/select-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import { initialFormState } from "@/lib/patients/form-schema";

export type EditableTreatment = {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
};

function TreatmentForm({
  treatment,
  onSaved,
}: {
  treatment?: EditableTreatment;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      const result = await (treatment ? updateTreatment : createTreatment)(
        previous,
        data,
      );
      if (result.status === "success") {
        toast.success(treatment ? t.treatments.updated : t.treatments.added);
        onSaved();
      }
      return result;
    },
    initialFormState,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }
  const errors = state.errors ?? {};
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {treatment && <input type="hidden" name="id" value={treatment.id} />}
      <FieldGroup>
        {state.message && (
          <Alert variant="destructive">
            <AlertDescription role="alert">{state.message}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="treatment-name">{t.treatments.name}</FieldLabel>
          <Input
            id="treatment-name"
            name="name"
            defaultValue={treatment?.name}
            required
            maxLength={200}
            aria-invalid={!!errors.name}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <SelectField
          name="category"
          label={t.treatments.category}
          options={Object.entries(t.treatments.categories).map(
            ([value, label]) => ({ value, label }),
          )}
          defaultValue={treatment?.category}
          error={errors.category}
        />
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="treatment-description">
            {t.treatments.description}
          </FieldLabel>
          <Textarea
            id="treatment-description"
            name="description"
            defaultValue={treatment?.description}
            maxLength={2000}
            aria-invalid={!!errors.description}
          />
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.durationMinutes}>
          <FieldLabel htmlFor="treatment-duration">
            {t.treatments.durationLabel}
          </FieldLabel>
          <Input
            id="treatment-duration"
            name="durationMinutes"
            type="number"
            min={5}
            max={600}
            defaultValue={treatment?.durationMinutes ?? 30}
            required
            aria-invalid={!!errors.durationMinutes}
          />
          {errors.durationMinutes && (
            <FieldError>{errors.durationMinutes}</FieldError>
          )}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" disabled={pending} />}
        >
          {t.common.cancel}
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {treatment ? t.treatments.save : t.treatments.add}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateTreatmentDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        {t.treatments.add}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.treatments.add}</DialogTitle>
          <DialogDescription>{t.treatments.addHelp}</DialogDescription>
        </DialogHeader>
        <TreatmentForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditTreatmentDialog({
  treatment,
}: {
  treatment: EditableTreatment;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" />}
        aria-label={t.treatments.editFor(treatment.name)}
      >
        {t.treatments.edit}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.treatments.editTitle}</DialogTitle>
          <DialogDescription>{t.treatments.editHelp}</DialogDescription>
        </DialogHeader>
        <TreatmentForm treatment={treatment} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
