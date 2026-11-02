"use client";
import { useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type { treatmentCategoryValues } from "@/lib/db/schema";
import { useI18n } from "@/lib/i18n/client";

export type TreatmentOption = {
  name: string;
  category: (typeof treatmentCategoryValues)[number];
};

// A visit keeps its treatments as text, one per line.
const toList = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function TreatmentSelect({
  id,
  name,
  options,
  defaultValue = "",
  invalid,
  describedBy,
  onChange,
}: {
  id?: string;
  name?: string;
  options: TreatmentOption[];
  defaultValue?: string;
  invalid?: boolean;
  describedBy?: string;
  onChange?: (value: string) => void;
}) {
  const { t } = useI18n();
  const anchor = useComboboxAnchor();
  const [selected, setSelected] = useState(() => toList(defaultValue));
  const category = new Map(options.map((o) => [o.name, o.category]));
  // Older visits may hold text from before the catalogue: it stays until removed.
  const items = [
    ...selected.filter((item) => !category.has(item)),
    ...options.map((option) => option.name),
  ];
  return (
    <div onKeyDown={(event) => event.stopPropagation()}>
      {name && <input type="hidden" name={name} value={selected.join("\n")} />}
      <Combobox
        multiple
        autoHighlight
        items={items}
        value={selected}
        onValueChange={(next: string[]) => {
          setSelected(next);
          onChange?.(next.join("\n"));
        }}
      >
        <ComboboxChips ref={anchor} aria-invalid={invalid}>
          <ComboboxValue>
            {(values: string[]) => (
              <>
                {values.map((value) => (
                  <ComboboxChip key={value}>{value}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  placeholder={t.registration.searchTreatment}
                  aria-describedby={describedBy}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>{t.registration.noTreatmentFound}</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => {
              const itemCategory = category.get(item);
              return (
                <ComboboxItem key={item} value={item}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{item}</span>
                    {itemCategory && (
                      <span className="truncate text-xs text-muted-foreground">
                        {t.treatments.categories[itemCategory]}
                      </span>
                    )}
                  </span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
