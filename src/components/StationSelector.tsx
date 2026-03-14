/**
 * Station number selector dropdown.
 *
 * Populated from the fetched event data. Changing station
 * re-filters the set list to only show sets from that station.
 */

"use client";

type Props = {
  stations: number[];
  selected: number | null;
  onChange: (station: number | null) => void;
};

export default function StationSelector({
  stations,
  selected,
  onChange,
}: Props) {
  if (!stations.length) return null;

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-zinc-400">Station:</span>
      <select
        value={selected ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val ? parseInt(val) : null);
        }}
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
      >
        {stations.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
