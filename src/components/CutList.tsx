/**
 * Read-only display of computed cuts.
 *
 * Shows each cut's start/end time (in seconds) and suggested filename.
 * Appears after the user clicks "Compute Cuts".
 */

'use client';

import type { CutEntry } from '@/lib/types';

type Props = {
  cuts: CutEntry[];
};

/** Format seconds as HH:MM:SS for display. */
function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CutList({ cuts }: Props) {
  if (!cuts.length) {
    return (
      <div className="border border-zinc-800 rounded-lg p-4 text-center text-sm text-zinc-500">
        Set recording start, select sets, then click Compute Cuts.
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 font-medium">
        {cuts.length} cut{cuts.length !== 1 ? 's' : ''} computed
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
        {cuts.map((cut, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className="text-zinc-500 w-6 text-right shrink-0">
              {i + 1}.
            </span>
            <span className="text-zinc-400 font-mono text-xs w-40 shrink-0 whitespace-nowrap">
              {formatTime(cut.startSec)} &ndash; {formatTime(cut.endSec)}
            </span>
            <span className="text-zinc-300 truncate">{cut.filename}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
