"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="drp-from">From</Label>
        <Input
          id="drp-from"
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="drp-to">To</Label>
        <Input
          id="drp-to"
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
        />
      </div>
    </div>
  );
}
