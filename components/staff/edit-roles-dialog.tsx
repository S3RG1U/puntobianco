"use client";

import { CircleAlertIcon } from "lucide-react";
import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { cn } from "cn";

import {
  updateStaffRoles,
  type StaffFormState,
} from "@/app/(clinic)/staff/actions";
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
import { Spinner } from "@/components/ui/spinner";
import type { RoleName } from "@/lib/auth/permissions";
import { useI18n } from "@/lib/i18n/client";

function EditRolesForm({
  userId,
  currentRoles,
  onSaved,
}: {
  userId: string;
  currentRoles: RoleName[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(
    async (previous: StaffFormState, formData: FormData) => {
      const result = await updateStaffRoles(previous, formData);

      if (result.status === "success") {
        toast.success(t.staff.rolesUpdated);
        onSaved();
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

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="-mx-4 flex flex-col gap-4 overflow-y-auto px-4">
        {state.message && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <RoleFields
          defaultRoles={currentRoles}
          error={state.fieldErrors?.roles?.[0]}
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          {t.common.cancel}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner data-icon="inline-start" />}
          {t.staff.saveRoles}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditRolesDialog({
  menuItem = false,
  userId,
  userName,
  currentRoles,
}: {
  menuItem?: boolean;
  userId: string;
  userName: string;
  currentRoles: RoleName[];
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant={menuItem ? "ghost" : "outline"}
            size="sm"
            className={cn(menuItem && "w-full justify-start")}
          />
        }
        aria-label={t.staff.editRolesFor(userName)}
      >
        {t.staff.editRoles}
      </DialogTrigger>
      <DialogContent className="flex max-h-[90svh] flex-col">
        <DialogHeader>
          <DialogTitle>{t.staff.editRoles}</DialogTitle>
          <DialogDescription>
            {t.staff.editRolesHelp(userName)}
          </DialogDescription>
        </DialogHeader>
        <EditRolesForm
          userId={userId}
          currentRoles={currentRoles}
          onSaved={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
