/**
 * Welcome modal shown on first launch.
 *
 * Asks if the user has used the tool before.
 * If no, shows a link to a tutorial video.
 * Dismissal is persisted in localStorage so it only shows once.
 */

"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "vod-splitter-welcomed";

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-100">
          Welcome to start.gg VOD Splitter
        </h2>

        {!showTutorial ? (
          <>
            <p className="text-sm text-zinc-400">
              This tool splits your tournament VODs into per-set clips using
              start.gg set timestamps. Have you used this tool before?
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
              >
                Yes, I know how it works
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded border border-zinc-600 transition-colors"
              >
                No, show me how
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Watch this quick tutorial to learn the workflow:
            </p>
            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-lg text-center text-sm text-red-300 transition-colors"
            >
              ▶ Watch Tutorial on YouTube
            </a>
            <p className="text-xs text-zinc-500">
              Quick summary: enter your start.gg event URL, fetch sets, pick
              your station, drop your VOD file, set the recording start time,
              compute cuts, then split!
            </p>
            <button
              onClick={dismiss}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors"
            >
              Got it, let&apos;s go
            </button>
          </>
        )}
      </div>
    </div>
  );
}
