"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { roleNames, type RoleName } from "@/lib/auth/permissions";
import { useI18n } from "@/lib/i18n/client";

export function RoleFields({
  defaultRoles = [],
  error,
}: {
  defaultRoles?: RoleName[];
  error?: string;
}) {
  const { t } = useI18n();

  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend variant="label">{t.staff.roles}</FieldLegend>
      <FieldGroup className="gap-3">
        {roleNames.map((role) => (
          <Field key={role} orientation="horizontal">
            <Checkbox
              id={`role-${role}`}
              name="roles"
              value={role}
              defaultChecked={defaultRoles.includes(role)}
            />
            <FieldContent>
              <FieldLabel htmlFor={`role-${role}`}>
                {t.roles[role].label}
              </FieldLabel>
              <FieldDescription>{t.roles[role].description}</FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
      <FieldError>{error}</FieldError>
    </FieldSet>
  );
}
