/**
 * Scrollable list of editable set rows.
 *
 * Displays all sets for the selected station with checkboxes,
 * editable titles, start times, and durations. Header row shows
 * column labels. Scrolls vertically when there are many sets.
 */

"use client";

import type { SetRowState } from "@/lib/types";
import SetRow from "./SetRow";

type Props = {
  rows: SetRowState[];
  onRowChange: (index: number, patch: Partial<SetRowState>) => void;
  stationLabel: string;
};

export default function SetList({ rows, onRowChange, stationLabel }: Props) {
  if (!rows.length) {
    return (
      <div className="border border-zinc-800 rounded-lg p-6 text-center text-sm text-zinc-500">
        {stationLabel
          ? `No sets with timestamps for station ${stationLabel}.`
          : "Fetch an event to see sets here."}
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      {/* Scrollable set rows */}
      <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/50">
        {rows.map((row, i) => (
          <SetRow
            key={row.setNode.id}
            row={row}
            onChange={(patch) => onRowChange(i, patch)}
          />
        ))}
      </div>

      {/* Footer with count */}
      <div className="px-3 py-1.5 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
        {rows.filter((r) => r.checked).length} of {rows.length} sets selected
      </div>
    </div>
  );
}
