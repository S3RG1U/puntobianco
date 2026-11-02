"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { PasswordInput } from "@/components/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

const MIN_PASSWORD_LENGTH = 8;
const themes = [
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
  { value: "system", icon: MonitorIcon },
] as const;

function SaveButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  );
}

function ProfileCard({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const labels = t.account.profile;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = String(new FormData(event.currentTarget).get("name")).trim();
    if (!next) return setError(t.validation.nameRequired);
    setError(undefined);
    setPending(true);
    const result = await authClient.updateUser({ name: next });
    setPending(false);
    if (result.error) return setError(labels.failed);
    toast.success(labels.saved);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="account-name">{labels.name}</FieldLabel>
              <Input
                id="account-name"
                name="name"
                defaultValue={name}
                autoComplete="name"
                maxLength={200}
                aria-invalid={!!error}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="account-email">{labels.email}</FieldLabel>
              <Input id="account-email" value={email} disabled readOnly />
              <FieldDescription>{labels.emailHelp}</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <SaveButton pending={pending}>{labels.save}</SaveButton>
        </CardFooter>
      </Card>
    </form>
  );
}

function PasswordCard() {
  const { t } = useI18n();
  const labels = t.account.password;
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
    form?: string;
  }>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("current"));
    const newPassword = String(data.get("next"));
    const invalid = {
      current: currentPassword ? undefined : labels.currentRequired,
      next:
        newPassword.length < MIN_PASSWORD_LENGTH
          ? t.validation.passwordTooShort
          : undefined,
      confirm: newPassword === data.get("confirm") ? undefined : labels.mismatch,
    };
    setErrors(invalid);
    if (invalid.current || invalid.next || invalid.confirm) return;
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error?.code === "INVALID_PASSWORD")
      return setErrors({ current: labels.wrongCurrent });
    if (error) return setErrors({ form: labels.failed });
    form.reset();
    toast.success(labels.saved);
  }

  const fields = [
    ["current", labels.current, "current-password", errors.current],
    ["next", labels.next, "new-password", errors.next],
    ["confirm", labels.confirm, "new-password", errors.confirm],
  ] as const;

  return (
    <form noValidate onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {errors.form && (
              <Alert variant="destructive">
                <AlertDescription role="alert">{errors.form}</AlertDescription>
              </Alert>
            )}
            {fields.map(([name, label, autoComplete, error]) => (
              <Field key={name} data-invalid={!!error}>
                <FieldLabel htmlFor={`account-${name}`}>{label}</FieldLabel>
                <PasswordInput
                  id={`account-${name}`}
                  name={name}
                  autoComplete={autoComplete}
                  maxLength={128}
                  aria-invalid={!!error}
                />
                {error && <FieldError>{error}</FieldError>}
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <SaveButton pending={pending}>{labels.save}</SaveButton>
        </CardFooter>
      </Card>
    </form>
  );
}

const subscribeNever = () => () => {};

function PreferencesCard() {
  const { t } = useI18n();
  const labels = t.account.preferences;
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>{t.common.language}</FieldLabel>
            <LocaleSwitcher />
          </Field>
          <Field>
            <FieldLabel>{labels.theme}</FieldLabel>
            <ToggleGroup
              aria-label={labels.theme}
              variant="outline"
              size="sm"
              value={mounted && theme ? [theme] : []}
              onValueChange={(value) => value[0] && setTheme(value[0])}
            >
              {themes.map(({ value, icon: Icon }) => (
                <ToggleGroupItem key={value} value={value}>
                  <Icon />
                  {labels.themes[value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

export function AccountSettings({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex flex-col gap-4">
      <ProfileCard name={name} email={email} />
      <PasswordCard />
      <PreferencesCard />
    </div>
  );
}
