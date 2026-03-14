/**
 * Split panel for the Tauri desktop app.
 *
 * Provides "Split with ffmpeg" button that:
 *   1. Opens a native folder picker for the output directory
 *   2. Calls the Rust backend to run ffmpeg on each cut
 *   3. Shows a live progress bar with per-clip status (spinner, check, X)
 *
 * Only rendered when running inside Tauri (desktop app).
 */

"use client";

import { useState, useCallback } from "react";
import type { CutEntry } from "@/lib/types";
import type { SplitProgress } from "@/lib/tauri";

type ClipStatus = {
  filename: string;
  status: "pending" | "started" | "done" | "error";
  error: string | null;
};

type Props = {
  cuts: CutEntry[];
  vodPath: string;
};

export default function SplitPanel({ cuts, vodPath }: Props) {
  const [splitting, setSplitting] = useState(false);
  const [clipStatuses, setClipStatuses] = useState<ClipStatus[]>([]);
  const [outputDir, setOutputDir] = useState("");
  const [doneMessage, setDoneMessage] = useState("");
  const [showPaths, setShowPaths] = useState(false);

  const handleSplit = useCallback(async () => {
    if (!vodPath) return;

    const { dirFromPath, splitVod } = await import("@/lib/tauri");

    // Default output: "clips" subfolder next to the VOD
    const vodDir = dirFromPath(vodPath);
    const sep = vodPath.includes("\\") ? "\\" : "/";
    const defaultOut = outputDir || `${vodDir}${sep}clips`;

    setOutputDir(defaultOut);
    setDoneMessage("");
    setSplitting(true);

    // Initialize all clips as pending
    setClipStatuses(
      cuts.map((c) => ({ filename: c.filename, status: "pending", error: null }))
    );

    const onProgress = (p: SplitProgress) => {
      setClipStatuses((prev) =>
        prev.map((clip, i) =>
          i === p.index
            ? { ...clip, status: p.status as ClipStatus["status"], error: p.error }
            : clip
        )
      );
    };

    try {
      const results = await splitVod(vodPath, defaultOut, cuts, onProgress);
      const ok = results.filter(Boolean).length;
      const failed = results.length - ok;
      if (failed > 0) {
        setDoneMessage(`Done! ${ok} clips created, ${failed} failed. Check errors above.`);
      } else {
        setDoneMessage(`Done! All ${ok} clips written to ${defaultOut}`);
      }
    } catch (err) {
      setDoneMessage(`Split error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSplitting(false);
    }
  }, [cuts, vodPath]);

  if (!cuts.length || !vodPath) return null;

  const handleChangeOutput = async () => {
    const { pickOutputFolder } = await import("@/lib/tauri");
    const folder = await pickOutputFolder();
    if (folder) setOutputDir(folder);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleSplit}
          disabled={splitting}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors"
        >
          {splitting ? "Splitting..." : "Split with ffmpeg"}
        </button>
        <button
          onClick={handleChangeOutput}
          disabled={splitting}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-sm text-zinc-300 rounded border border-zinc-600 transition-colors"
        >
          Change output folder
        </button>
        {outputDir && (
          <button
            onClick={() => setShowPaths(!showPaths)}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showPaths ? "Hide path" : "Show path"}
          </button>
        )}
        {outputDir && showPaths && (
          <span className="text-xs text-zinc-500 truncate max-w-md">
            {outputDir}
          </span>
        )}
      </div>

      {/* Progress list */}
      {clipStatuses.length > 0 && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/50">
            {clipStatuses.map((clip, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 text-sm"
              >
                {/* Status icon */}
                <span className="w-5 shrink-0 text-center">
                  {clip.status === "pending" && (
                    <span className="text-zinc-600">·</span>
                  )}
                  {clip.status === "started" && (
                    <span className="text-blue-400 animate-spin inline-block">⠋</span>
                  )}
                  {clip.status === "done" && (
                    <span className="text-green-400">✓</span>
                  )}
                  {clip.status === "error" && (
                    <span className="text-red-400">✗</span>
                  )}
                </span>

                <span
                  className={`truncate ${
                    clip.status === "done"
                      ? "text-zinc-300"
                      : clip.status === "error"
                        ? "text-red-300"
                        : clip.status === "started"
                          ? "text-zinc-200"
                          : "text-zinc-500"
                  }`}
                >
                  {clip.filename}
                </span>

                {clip.error && (
                  <span className="text-xs text-red-400 truncate ml-auto max-w-xs">
                    {clip.error}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          {splitting && (
            <div className="h-1 bg-zinc-800">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${
                    (clipStatuses.filter((c) => c.status === "done" || c.status === "error").length /
                      clipStatuses.length) *
                    100
                  }%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Done message (hides folder path for stream privacy) */}
      {doneMessage && (
        <p
          className={`text-sm ${
            doneMessage.includes("failed") || doneMessage.includes("error")
              ? "text-amber-400"
              : "text-green-400"
          }`}
        >
          {showPaths
            ? doneMessage
            : doneMessage.replace(/written to .+$/, "written successfully!")
                         .replace(/created,.+$/, "created. Check errors above.")}
        </p>
      )}
    </div>
  );
}
