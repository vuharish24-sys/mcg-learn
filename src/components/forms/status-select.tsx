"use client";

import { useRouter } from "next/navigation";
import { fieldClassName } from "@/components/ui/input";
import { enumLabel } from "@/lib/utils";

export function StatusSelect({
  endpoint,
  value,
  options,
}: {
  endpoint: string;
  value: string;
  options: string[];
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Update status"
      className={`${fieldClassName} h-8 min-w-32 py-0 text-xs`}
      defaultValue={value}
      onChange={async (event) => {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: event.target.value }),
        });
        if (response.ok) router.refresh();
      }}
    >
      {options.map((option) => <option key={option} value={option}>{enumLabel(option)}</option>)}
    </select>
  );
}
