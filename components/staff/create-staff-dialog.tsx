"use client";

import { CircleAlertIcon, PlusIcon } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  createStaffMember,
  type StaffFormState,
} from "@/app/(clinic)/staff/actions";
import { PasswordInput } from "@/components/password-input";
import { RoleFields } from "@/components/staff/role-fields";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";

function CreateStaffForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(
    async (previous: StaffFormState, formData: FormData) => {
      const result = await createStaffMember(previous, formData);

      if (result.status === "success") {
        toast.success(t.staff.created);
        onCreated();
      }

      return result;
    },
    { status: "idle" },
  );

  // Submitting through onSubmit keeps what was typed when validation fails.
  // React resets uncontrolled fields when a form uses the action prop.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }
  const errors = state.fieldErrors;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <div className="-mx-4 overflow-y-auto px-4">
        <FieldGroup className="gap-5">
          {state.message && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <Field data-invalid={Boolean(errors?.name)}>
            <FieldLabel htmlFor="staff-name">{t.staff.fullName}</FieldLabel>
            <Input
              id="staff-name"
              name="name"
              autoComplete="off"
              aria-invalid={Boolean(errors?.name)}
              required
            />
            <FieldError>{errors?.name?.[0]}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors?.email)}>
            <FieldLabel htmlFor="staff-email">{t.staff.email}</FieldLabel>
            <Input
              id="staff-email"
              name="email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(errors?.email)}
              required
            />
            <FieldError>{errors?.email?.[0]}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors?.password)}>
            <FieldLabel htmlFor="staff-password">{t.staff.tempPassword}</FieldLabel>
            <PasswordInput
              id="staff-password"
              name="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors?.password)}
              required
            />
            <FieldDescription>
              {t.staff.tempPasswordHelp}
            </FieldDescription>
            <FieldError>{errors?.password?.[0]}</FieldError>
          </Field>
          <RoleFields error={errors?.roles?.[0]} />
        </FieldGroup>
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner data-icon="inline-start" />}
          {t.staff.create}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CreateStaffDialog() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        {t.staff.add}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90svh] flex-col">
        <DialogHeader>
          <DialogTitle>{t.staff.add}</DialogTitle>
          <DialogDescription>{t.staff.addHelp}</DialogDescription>
        </DialogHeader>
        <CreateStaffForm onCreated={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
