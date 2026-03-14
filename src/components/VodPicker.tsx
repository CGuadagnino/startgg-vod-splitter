/**
 * VOD file picker with drag-and-drop support.
 *
 * In Tauri (desktop): uses Tauri's onDragDropEvent for drag-and-drop (full paths),
 * plus native file dialog for click-to-browse.
 * In browser (web): click uses File API (filename only).
 */

"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  vodFilename: string;
  vodPath: string;
  onFilePicked: (filename: string, fullPath: string) => void;
};

export default function VodPicker({ vodFilename, vodPath, onFilePicked }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  // Listen for Tauri's native drag-drop events (gives full file paths)
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | null = null;

    (async () => {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setDragOver(true);
        } else if (event.payload.type === "leave") {
          setDragOver(false);
        } else if (event.payload.type === "drop") {
          setDragOver(false);
          const paths = event.payload.paths;
          if (paths.length > 0) {
            const fullPath = paths[0];
            const parts = fullPath.split(/[\\/]/);
            const filename = parts[parts.length - 1] || fullPath;
            onFilePicked(filename, fullPath);
          }
        }
      });
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauri, onFilePicked]);

  const handleClick = async () => {
    if (isTauri) {
      const { pickVodFile, filenameFromPath } = await import("@/lib/tauri");
      const path = await pickVodFile();
      if (path) {
        onFilePicked(filenameFromPath(path), path);
      }
      return;
    }
    inputRef.current?.click();
  };

  const handleBrowserFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFilePicked(file.name, "");
  };

  // Browser-only drag handlers (Tauri uses its own event system above)
  const handleBrowserDrop = (e: React.DragEvent) => {
    if (isTauri) return; // handled by Tauri listener
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFilePicked(file.name, "");
  };

  return (
    <div className="space-y-1">
      <div
        onClick={handleClick}
        onDragOver={(e) => { e.preventDefault(); if (!isTauri) setDragOver(true); }}
        onDragLeave={() => { if (!isTauri) setDragOver(false); }}
        onDrop={handleBrowserDrop}
        className={`
          border-2 border-dashed rounded-lg px-6 py-4 text-center cursor-pointer
          transition-colors
          ${dragOver
            ? "border-blue-500 bg-blue-500/10"
            : vodPath
              ? "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
              : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
          }
        `}
      >
        {vodPath ? (
          <div>
            <p className="text-sm text-zinc-300">{vodFilename}</p>
            <p className="text-xs text-zinc-600 mt-1">
              Drop a different file or click to change
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-zinc-400">
              Drop your VOD file here
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              or click to browse
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.ts,.mkv"
        onChange={handleBrowserFile}
        className="hidden"
      />
    </div>
  );
}
