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
} from "@/app/dashboard/accommodations/actions";
import { apartmentOptions, initialFormState } from "@/lib/patients/form-schema";
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
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      const result = await createApartment(previous, data);
      if (result.status === "success") {
        toast.success("Apartment added.");
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
          <FieldLabel htmlFor="apartment-name">Apartment name</FieldLabel>
          <Input
            id="apartment-name"
            name="name"
            placeholder="For example: Parc, apartment 12"
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
        <SelectField
          name="apartmentType"
          label="Apartment type"
          options={apartmentOptions}
          error={state.errors?.apartmentType}
        />
      </FieldGroup>
      <DialogFooter>
        <DialogClose
          render={<Button type="button" variant="outline" disabled={pending} />}
        >
          Cancel
        </DialogClose>
        <Button disabled={pending} type="submit">
          {pending && <Spinner data-icon="inline-start" />}Add apartment
        </Button>
      </DialogFooter>
    </form>
  );
}
export function CreateApartmentDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Add apartment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add apartment</DialogTitle>
          <DialogDescription>
            Add a property that can be assigned to patient stays.
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
  const [free, setFree] = useState(request.isFree);
  const [state, action, pending] = useActionState(
    async (previous: typeof initialFormState, data: FormData) => {
      const result = await updateAccommodation(previous, data);
      if (result.status === "success") {
        toast.success("Accommodation updated.");
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
    { value: "unassigned", label: "Leave unassigned" },
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
          label="Apartment"
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
            Include complimentary days
          </FieldLabel>
        </Field>
        {free && (
          <Field data-invalid={!!state.errors?.freeDays}>
            <FieldLabel htmlFor={`days-${request.id}`}>
              Complimentary days
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
          Cancel
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}Save accommodation
        </Button>
      </DialogFooter>
    </form>
  );
}
export function ManageAccommodationDialog({
  request,
  apartments,
  patientName,
}: {
  request: AccommodationRequest;
  apartments: Apartment[];
  patientName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Manage<span className="sr-only"> accommodation for {patientName}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage accommodation</DialogTitle>
          <DialogDescription>
            Assign an apartment and set complimentary days for {patientName}.
            Availability is checked when you save.
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
