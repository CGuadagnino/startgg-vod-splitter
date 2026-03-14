/**
 * Event input: slug/URL field, tournament name, and Fetch button.
 *
 * Accepts a full start.gg URL or bare slug like:
 *   tournament/the-hangout-1/event/rivals-of-aether-ii-singles
 * Extracts the slug pattern automatically from URLs.
 */

"use client";

type Props = {
  slug: string;
  onSlugChange: (slug: string) => void;
  tournamentName: string;
  onTournamentNameChange: (name: string) => void;
  onFetch: () => void;
  loading: boolean;
  status: string;
};

export default function EventInput({
  slug,
  onSlugChange,
  tournamentName,
  onTournamentNameChange,
  onFetch,
  loading,
  status,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Slug input + fetch */}
      <div className="flex gap-2">
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onFetch()}
          placeholder="Event URL or slug (e.g. tournament/the-hangout-1/event/rivals-of-aether-ii-singles)"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={onFetch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
        >
          {loading ? "Fetching..." : "Fetch Sets"}
        </button>
      </div>

      {/* Tournament name */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={tournamentName}
          onChange={(e) => onTournamentNameChange(e.target.value)}
          placeholder="Tournament name (e.g. The Hangout #1)"
          className="flex-1 max-w-md bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <span className="text-xs text-zinc-500">Used in video titles</span>
      </div>

      {/* Status message */}
      {status && (
        <p className="text-xs text-zinc-400">{status}</p>
      )}
    </div>
  );
}
