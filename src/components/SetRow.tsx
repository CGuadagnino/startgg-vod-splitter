/**
 * A single set row in the editable set list.
 *
 * Two-line layout for readability:
 *   Line 1: checkbox + editable title + warning
 *   Line 2: start date, start time (HH:MM:SS), duration (MM:SS)
 * All number inputs zero-padded to two digits.
 */

"use client";

import type { SetRowState } from "@/lib/types";
import { DURATION_WARN_MINUTES } from "@/lib/vod";

type Props = {
  row: SetRowState;
  onChange: (patch: Partial<SetRowState>) => void;
};

/** Zero-pad a number to 2 digits for display. */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function SetRow({ row, onChange }: Props) {
  const totalSeconds = row.durationMinutes * 60 + row.durationSeconds;
  const tooLong = totalSeconds > DURATION_WARN_MINUTES * 60;

  return (
    <div className={`py-2 px-3 rounded hover:bg-zinc-800/50 group ${tooLong ? "bg-red-950/20" : ""}`}>
      {/* Line 1: Checkbox + Title + Warning */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={row.checked}
          onChange={(e) => onChange({ checked: e.target.checked })}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-0 focus:ring-offset-0 shrink-0"
        />
        <input
          type="text"
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 min-w-0 bg-transparent border border-transparent hover:border-zinc-700 focus:border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none"
        />
        {tooLong && (
          <span className="text-xs text-red-400 whitespace-nowrap shrink-0 font-medium">
            ⚠ Duration too long — fix before computing
          </span>
        )}
      </div>

      {/* Line 2: Date + Time + Duration */}
      <div className="flex items-center gap-3 mt-1.5 ml-6">
        {/* Start date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 w-8">Start:</span>
          <input
            type="date"
            value={row.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 w-32"
          />
        </div>

        {/* Start time HH:MM:SS */}
        <div className="flex items-center gap-0.5">
          <input
            type="text"
            value={pad2(row.startHour)}
            onChange={(e) => onChange({ startHour: clamp(parseInt(e.target.value) || 0, 0, 23) })}
            className="w-9 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-center text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
          <span className="text-zinc-600 text-xs">:</span>
          <input
            type="text"
            value={pad2(row.startMinute)}
            onChange={(e) => onChange({ startMinute: clamp(parseInt(e.target.value) || 0, 0, 59) })}
            className="w-9 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-center text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
          <span className="text-zinc-600 text-xs">:</span>
          <input
            type="text"
            value={pad2(row.startSecond)}
            onChange={(e) => onChange({ startSecond: clamp(parseInt(e.target.value) || 0, 0, 59) })}
            className="w-9 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-center text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Duration MM:SS */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500">Dur:</span>
          <input
            type="text"
            value={pad2(row.durationMinutes)}
            onChange={(e) => onChange({ durationMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-10 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-center text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
          <span className="text-zinc-600 text-xs">:</span>
          <input
            type="text"
            value={pad2(row.durationSeconds)}
            onChange={(e) => onChange({ durationSeconds: clamp(parseInt(e.target.value) || 0, 0, 59) })}
            className="w-9 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-center text-zinc-300 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>
    </div>
  );
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
