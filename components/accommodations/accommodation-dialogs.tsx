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
  createApartment,
  updateAccommodation,
} from "@/app/(clinic)/accommodations/actions";
import { useI18n } from "@/lib/i18n/client";
import { apartmentValues, initialFormState } from "@/lib/patients/form-schema";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export type Apartment = { id: string; name: string; apartmentType: string };
export type AccommodationRequest = {
  id: string;
  apartmentType: string;
  accommodationId: string | null;
  isFree: boolean;
  freeDays: number;
};

function ApartmentForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      const result = await createApartment(previous, data);
      if (result.status === "success") {
        toast.success(t.accommodations.apartmentAdded);
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
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        {state.message && (
          <Alert variant="destructive">
            <AlertDescription role="alert">{state.message}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!state.errors?.name}>
          <FieldLabel htmlFor="apartment-name">
            {t.accommodations.apartmentName}
          </FieldLabel>
          <Input
            id="apartment-name"
            name="name"
            placeholder={t.accommodations.apartmentNamePlaceholder}
            required
            maxLength={200}
            aria-invalid={!!state.errors?.name}
            aria-describedby={
              state.errors?.name ? "apartment-name-error" : undefined
            }
          />
          {state.errors?.name && (
            <FieldError id="apartment-name-error">
              {state.errors.name}
            </FieldError>
          )}
        </Field>
        <Field data-invalid={!!state.errors?.address}>
          <FieldLabel htmlFor="apartment-address">
            {t.accommodations.address}
          </FieldLabel>
          <Input
            id="apartment-address"
            name="address"
            required
            maxLength={500}
            placeholder={t.accommodations.addressHelp}
            aria-invalid={!!state.errors?.address}
          />
          {state.errors?.address && (
            <FieldError>{state.errors.address}</FieldError>
          )}
        </Field>
        <SelectField
          name="apartmentType"
          label={t.registration.apartmentType}
          options={apartmentValues.map((value) => ({
            value,
            label: t.apartmentTypes[value],
          }))}
          error={state.errors?.apartmentType}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" disabled={pending} />}
        >
          {t.common.cancel}
        </DialogClose>
        <Button disabled={pending} type="submit">
          {pending && <Spinner data-icon="inline-start" />}
          {t.accommodations.addApartment}
        </Button>
      </DialogFooter>
    </form>
  );
}
export function CreateApartmentDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        {t.accommodations.addApartment}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.accommodations.addApartment}</DialogTitle>
          <DialogDescription>
            {t.accommodations.addApartmentHelp}
          </DialogDescription>
        </DialogHeader>
        <ApartmentForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AllocationForm({
  request,
  apartments,
  onSaved,
}: {
  request: AccommodationRequest;
  apartments: Apartment[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [free, setFree] = useState(request.isFree);
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      const result = await updateAccommodation(previous, data);
      if (result.status === "success") {
        toast.success(t.accommodations.updated);
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
  const options = [
    { value: "unassigned", label: t.accommodations.leaveUnassigned },
    ...apartments
      .filter((a) => a.apartmentType === request.apartmentType)
      .map((a) => ({ value: a.id, label: a.name })),
  ];
  const [apartmentId, setApartmentId] = useState(
    request.accommodationId ?? "unassigned",
  );
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="id" value={request.id} />
      <input
        type="hidden"
        name="accommodationId"
        value={apartmentId === "unassigned" ? "" : apartmentId}
      />
      <FieldGroup>
        {state.message && (
          <Alert variant="destructive">
            <AlertDescription role="alert">{state.message}</AlertDescription>
          </Alert>
        )}
        <SelectField
          name="apartmentChoice"
          label={t.common.apartment}
          options={options}
          defaultValue={apartmentId}
          onValueChange={setApartmentId}
          error={state.errors?.accommodationId}
        />
        <Field orientation="horizontal">
          <Checkbox
            id={`free-${request.id}`}
            name="isFree"
            checked={free}
            onCheckedChange={(value) => setFree(value === true)}
          />
          <FieldLabel htmlFor={`free-${request.id}`}>
            {t.accommodations.includeFreeDays}
          </FieldLabel>
        </Field>
        {free && (
          <Field data-invalid={!!state.errors?.freeDays}>
            <FieldLabel htmlFor={`days-${request.id}`}>
              {t.accommodations.freeDays}
            </FieldLabel>
            <Input
              id={`days-${request.id}`}
              name="freeDays"
              type="number"
              min={1}
              max={3650}
              defaultValue={request.freeDays || 1}
              aria-invalid={!!state.errors?.freeDays}
              aria-describedby={
                state.errors?.freeDays ? `days-${request.id}-error` : undefined
              }
              required
            />
            {state.errors?.freeDays && (
              <FieldError id={`days-${request.id}-error`}>
                {state.errors.freeDays}
              </FieldError>
            )}
          </Field>
        )}
      </FieldGroup>
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" disabled={pending} />}
        >
          {t.common.cancel}
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {t.accommodations.save}
        </Button>
      </DialogFooter>
    </form>
  );
}
export function ManageAccommodationDialog({
  menuItem = false,
  request,
  apartments,
  patientName,
}: {
  menuItem?: boolean;
  request: AccommodationRequest;
  apartments: Apartment[];
  patientName: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={menuItem ? "ghost" : "outline"}
            size="sm"
            className={menuItem ? "w-full justify-start" : undefined}
          />
        }
      >
        {t.accommodations.manage}
        <span className="sr-only">
          {t.accommodations.manageFor(patientName)}
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.accommodations.manageTitle}</DialogTitle>
          <DialogDescription>
            {t.accommodations.manageHelp(patientName)}
          </DialogDescription>
        </DialogHeader>
        <AllocationForm
          request={request}
          apartments={apartments}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
