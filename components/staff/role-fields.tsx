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
import {
  roleDescriptions,
  roleLabels,
  roleNames,
  type RoleName,
} from "@/lib/auth/permissions";

export function RoleFields({
  defaultRoles = [],
  error,
}: {
  defaultRoles?: RoleName[];
  error?: string;
}) {
  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend variant="label">Roles</FieldLegend>
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
                {roleLabels[role]}
              </FieldLabel>
              <FieldDescription>{roleDescriptions[role]}</FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
      <FieldError>{error}</FieldError>
    </FieldSet>
  );
}
