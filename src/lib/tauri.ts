/**
 * Tauri-specific helpers for desktop features.
 *
 * Wraps Tauri APIs for:
 *   - Native file picker (returns full system path)
 *   - Native folder picker (returns full system path)
 *   - ffmpeg VOD splitting via Rust backend with progress events
 *
 * These are only available when running inside Tauri (desktop app).
 * The web version falls back to browser File API + script generation.
 */

import type { CutEntry } from "./types";

/** Check if we're running inside the Tauri desktop app. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Open a native file picker for video files. Returns the full file path or null. */
export async function pickVodFile(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    title: "Select VOD file",
    multiple: false,
    filters: [
      { name: "Video", extensions: ["mp4", "mkv", "mov", "avi", "ts"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (!result) return null;
  // With multiple: false, result is string | null
  return typeof result === "string" ? result : String(result);
}

/** Open a native folder picker. Returns the full directory path or null. */
export async function pickOutputFolder(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    title: "Select output folder for clips",
    directory: true,
    multiple: false,
  });
  if (typeof result === "string") return result;
  return null;
}

/** Progress event shape emitted by the Rust backend during splitting. */
export type SplitProgress = {
  index: number;
  total: number;
  filename: string;
  status: "started" | "done" | "error";
  error: string | null;
};

/**
 * Split a VOD using the Rust backend + bundled ffmpeg.
 *
 * Calls the `split_vod` Tauri command and listens for `split-progress`
 * events. Returns a promise that resolves when all cuts are done.
 */
export async function splitVod(
  vodPath: string,
  outputDir: string,
  cuts: CutEntry[],
  onProgress: (progress: SplitProgress) => void
): Promise<boolean[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  const { listen } = await import("@tauri-apps/api/event");

  // Listen for progress events from the Rust backend
  const unlisten = await listen<SplitProgress>("split-progress", (event) => {
    onProgress(event.payload);
  });

  try {
    // Call the Rust command. It runs ffmpeg for each cut sequentially
    // and emits progress events. Returns array of success booleans.
    const results = await invoke<boolean[]>("split_vod", {
      vodPath,
      outputDir,
      cuts: cuts.map((c) => ({
        start_sec: c.startSec,
        end_sec: c.endSec,
        filename: c.filename,
      })),
    });

    return results;
  } finally {
    unlisten();
  }
}

/**
 * Extract just the filename from a full file path.
 * Works with both Windows (\) and Unix (/) separators.
 */
export function filenameFromPath(fullPath: string): string {
  const parts = fullPath.split(/[\\/]/);
  return parts[parts.length - 1] || fullPath;
}

/**
 * Extract the directory from a full file path.
 */
export function dirFromPath(fullPath: string): string {
  const sep = fullPath.includes("\\") ? "\\" : "/";
  const parts = fullPath.split(sep);
  parts.pop();
  return parts.join(sep);
}
