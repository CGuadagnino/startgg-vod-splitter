/**
 * Recording start time picker.
 *
 * Shows date + hour:minute:second inputs for the VOD's recording start time.
 * Auto-filled when the user picks a VOD file with an OBS-style filename,
 * but always editable if the auto-detection is wrong.
 */

'use client';

type Props = {
  date: string; // "YYYY-MM-DD"
  hour: number;
  minute: number;
  second: number;
  onDateChange: (date: string) => void;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onSecondChange: (second: number) => void;
};

export default function RecordingStart({
  date,
  hour,
  minute,
  second,
  onDateChange,
  onHourChange,
  onMinuteChange,
  onSecondChange,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-zinc-400">Recording start:</span>

      {/* Date */}
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
      />

      {/* Hour:Minute:Second */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={23}
          value={String(hour).padStart(2, '0')}
          onChange={(e) =>
            onHourChange(clamp(parseInt(e.target.value) || 0, 0, 23))
          }
          className="w-12 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 text-center focus:outline-none focus:border-zinc-500"
        />
        <span className="text-zinc-500">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={String(minute).padStart(2, '0')}
          onChange={(e) =>
            onMinuteChange(clamp(parseInt(e.target.value) || 0, 0, 59))
          }
          className="w-12 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 text-center focus:outline-none focus:border-zinc-500"
        />
        <span className="text-zinc-500">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={String(second).padStart(2, '0')}
          onChange={(e) =>
            onSecondChange(clamp(parseInt(e.target.value) || 0, 0, 59))
          }
          className="w-12 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 text-center focus:outline-none focus:border-zinc-500"
        />
      </div>
    </div>
  );
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
