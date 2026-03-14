/**
 * Shared types for the start.gg VOD Splitter web app.
 */

/** A single set node from the start.gg GraphQL API. */
export type SetNode = {
  id: string;
  startedAt: number | null;
  completedAt: number | null;
  fullRoundText: string | null;
  winnerId: number | null;
  station: { number: number } | null;
  games: Array<{
    selections: Array<{
      entrant: { id: string; name: string } | null;
      character: { name: string } | null;
    }>;
  }> | null;
};

/** The full event data response from start.gg (merged across pages). */
export type EventData = {
  event: {
    id?: number;
    name?: string;
    sets: { nodes: SetNode[] };
  };
};

/** A computed cut: start/end offsets in the VOD + suggested filename. */
export type CutEntry = {
  startSec: number;
  endSec: number;
  filename: string;
};

/** Per-set UI state in the editable set list. */
export type SetRowState = {
  setNode: SetNode;
  checked: boolean;
  title: string;
  startDate: string; // "YYYY-MM-DD"
  startHour: number;
  startMinute: number;
  startSecond: number;
  durationMinutes: number;
  durationSeconds: number;
};
