"use client";

import { useRouter } from "next/navigation";
import type { FormOption } from "@/types/resource";
import { fieldClassName } from "@/components/ui/input";

export function PropertySelect({
  endpoint,
  property,
  value,
  options,
}: {
  endpoint: string;
  property: string;
  value: string;
  options: FormOption[];
}) {
  const router = useRouter();
  return (
    <select
      className={`${fieldClassName} h-8 min-w-36 py-0 text-xs`}
      aria-label={`Update ${property}`}
      defaultValue={value}
      onChange={async (event) => {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [property]: event.target.value }),
        });
        if (response.ok) router.refresh();
      }}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}
