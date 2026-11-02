"use client";
import { useState } from "react";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
export function SelectField({
  name,
  label,
  options,
  error,
  defaultValue,
  onValueChange,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState<string | null>(defaultValue ?? null);
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select
        name={name}
        items={options}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          if (next) onValueChange?.(next);
        }}
      >
        <SelectTrigger
          id={name}
          className="w-full"
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        >
          <SelectValue placeholder={t.common.chooseOption} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <FieldError id={`${name}-error`}>{error}</FieldError>}
    </Field>
  );
}
