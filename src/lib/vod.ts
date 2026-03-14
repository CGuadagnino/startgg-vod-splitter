/**
 * VOD timing and cut computation.
 *
 * Handles: parsing recording start from OBS filenames, computing cut offsets
 * from start.gg timestamps, sanitizing filenames, and exporting cut lists.
 *
 * All time math works in UTC seconds. The recording start and set timestamps
 * are compared as absolute times to produce VOD-relative offsets.
 */

import type { CutEntry, SetRowState } from "./types";

/** Warn threshold: sets longer than this (in minutes) likely have bad end times. */
export const DURATION_WARN_MINUTES = 45;

/**
 * Try to parse a recording start time from an OBS-style filename.
 * OBS default format: "YYYY-MM-DD HH-MM-SS.ext"
 * Returns a Date or null if the filename doesn't match.
 */
export function parseRecordingStartFromFilename(
  filename: string
): Date | null {
  // Match OBS default naming: "2024-01-15 18-30-00" anywhere in the filename
  const match = filename.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2})-(\d{2})-(\d{2})/
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  // Construct as local time (OBS records in local time)
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

/**
 * Get local (year, month, day, hour, minute, second) from a Unix timestamp.
 * Used to pre-fill the editable start/end times in the set list.
 */
export function unixToLocalParts(
  timestamp: number
): [number, number, number, number, number, number] {
  const d = new Date(timestamp * 1000);
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ];
}

/**
 * Build a Date from local date/time parts (what the user sees in the UI).
 */
export function localPartsToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Make a string safe for use as a filename.
 * Strips filesystem-unsafe characters and collapses whitespace.
 */
export function sanitizeFilename(name: string, maxLen = 120): string {
  let safe = name.replace(/[<>:"/\\|?*]/g, "_");
  safe = safe.replace(/\s+/g, " ").trim();
  return (safe.length > maxLen ? safe.slice(0, maxLen) : safe) || "clip";
}

/**
 * Compute cuts from the editable set row states + recording start time.
 *
 * For each checked set row, calculates the VOD-relative start/end offsets
 * by comparing the set's absolute start time against the recording start.
 *
 * Returns: array of CutEntry (start_sec, end_sec, filename).
 */
export function computeCuts(
  rows: SetRowState[],
  recordingStart: Date
): CutEntry[] {
  const recStartMs = recordingStart.getTime();
  const cuts: CutEntry[] = [];

  for (const row of rows) {
    if (!row.checked) continue;

    // Parse the row's start date + time into a local Date
    const [year, month, day] = row.startDate.split("-").map(Number);
    if (!year || !month || !day) continue;

    const setStart = localPartsToDate(
      year,
      month,
      day,
      row.startHour,
      row.startMinute,
      row.startSecond
    );

    // End time = start + duration
    const durationMs =
      (row.durationMinutes * 60 + row.durationSeconds) * 1000;
    if (durationMs <= 0) continue;

    const setEnd = new Date(setStart.getTime() + durationMs);

    // VOD-relative offsets (in seconds)
    const startSec = Math.max(0, (setStart.getTime() - recStartMs) / 1000);
    const endSec = Math.max(startSec, (setEnd.getTime() - recStartMs) / 1000);

    const filename = sanitizeFilename(row.title || "clip");
    cuts.push({ startSec, endSec, filename });
  }

  return cuts;
}

/**
 * Generate a JSON cut list string for download.
 */
export function exportJSON(
  cuts: CutEntry[],
  vodFilename: string
): string {
  const items = cuts.map((c) => ({
    start_sec: c.startSec,
    end_sec: c.endSec,
    filename: c.filename,
    vod_file: vodFilename,
  }));
  return JSON.stringify(items, null, 2);
}

/**
 * Generate a CSV cut list string for download.
 * Compatible with LosslessCut and other tools.
 */
export function exportCSV(cuts: CutEntry[]): string {
  const header = "start_sec,end_sec,filename";
  const rows = cuts.map(
    (c) => `${c.startSec},${c.endSec},"${c.filename.replace(/"/g, '""')}"`
  );
  return [header, ...rows].join("\n");
}

/**
 * Trigger a file download in the browser from a string.
 */
export function downloadString(
  content: string,
  filename: string,
  mimeType = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
