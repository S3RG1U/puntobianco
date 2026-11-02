"use client";

import { CircleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { PasswordInput } from "@/components/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage, type Dictionary } from "@/lib/i18n/dictionaries";

const credentialsSchema = z.object({
  email: z.email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

type FieldErrors = { email?: string[]; password?: string[] };

function getSignInErrorMessage(status: number, t: Dictionary) {
  if (status === 401) return t.login.errors.incorrect;
  if (status === 403) return t.login.errors.disabled;
  if (status === 429) return t.login.errors.tooMany;
  return t.login.errors.generic;
}

export function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = credentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors(errors);
      form
        .querySelector<HTMLInputElement>(
          errors.email ? "#email" : "#password",
        )
        ?.focus();
      return;
    }

    setFieldErrors({});
    setIsPending(true);

    const { error } = await authClient.signIn.email(parsed.data);

    if (error) {
      setFormError(getSignInErrorMessage(error.status, t));
      setIsPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t.login.heading}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t.login.subheading}
          </p>
        </div>
        {formError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(fieldErrors.email)}>
          <FieldLabel htmlFor="email">{t.login.email}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t.login.emailPlaceholder}
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            required
          />
          <FieldError id="email-error">{fieldErrors.email && validationMessage(t, fieldErrors.email[0])}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.password)}>
          <FieldLabel htmlFor="password">{t.login.password}</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            required
          />
          <FieldError id="password-error">
            {fieldErrors.password && validationMessage(t, fieldErrors.password[0])}
          </FieldError>
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? t.login.submitting : t.login.submit}
          </Button>
          <FieldDescription className="text-center">
            {t.login.help}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
