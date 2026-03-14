/**
 * Main page for the start.gg VOD Splitter desktop app.
 *
 * Orchestrates the full workflow:
 *  1. Fetch event sets from start.gg
 *  2. Select station, pick VOD, set recording start
 *  3. Edit set list (titles, times, durations)
 *  4. Compute cuts
 *  5. Split with bundled ffmpeg
 */

"use client";

import { useState, useCallback } from "react";
import type { EventData, SetNode, SetRowState, CutEntry } from "@/lib/types";
import {
  parseSlug,
  fetchEventSets,
  getSetsByStation,
  getStationNumbers,
  setDisplayName,
} from "@/lib/startgg";
import {
  parseRecordingStartFromFilename,
  unixToLocalParts,
  localPartsToDate,
  computeCuts,
} from "@/lib/vod";

import EventInput from "@/components/EventInput";
import StationSelector from "@/components/StationSelector";
import VodPicker from "@/components/VodPicker";
import RecordingStart from "@/components/RecordingStart";
import SetList from "@/components/SetList";
import CutList from "@/components/CutList";
import SplitPanel from "@/components/SplitPanel";
import WelcomeModal from "@/components/WelcomeModal";

/** Build initial SetRowState array from fetched sets. */
function buildSetRows(
  sets: SetNode[],
  tournamentName: string
): SetRowState[] {
  return sets.map((setNode) => {
    const name = setDisplayName(setNode);
    const round = (setNode.fullRoundText ?? "").trim();

    let title = tournamentName ? `[${tournamentName}] ${name}` : name;
    if (round) title = `${title} - ${round}`;

    let startDate = "";
    let startHour = 0;
    let startMinute = 0;
    let startSecond = 0;
    let durationMinutes = 0;
    let durationSeconds = 0;

    if (setNode.startedAt) {
      const [y, mo, d, h, mi, s] = unixToLocalParts(setNode.startedAt);
      startDate = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      startHour = h;
      startMinute = mi;
      startSecond = s;
    }

    if (setNode.startedAt && setNode.completedAt) {
      const totalSec = Math.max(0, setNode.completedAt - setNode.startedAt);
      durationMinutes = Math.floor(totalSec / 60);
      durationSeconds = totalSec % 60;
    }

    return {
      setNode, checked: true, title, startDate,
      startHour, startMinute, startSecond,
      durationMinutes, durationSeconds,
    };
  });
}

export default function Home() {
  // Event fetch state
  const [slug, setSlug] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Enter an event URL or slug, then click Fetch Sets.");

  // Station + set state
  const [stations, setStations] = useState<number[]>([]);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [setRows, setSetRows] = useState<SetRowState[]>([]);

  // VOD + recording start
  const [vodFilename, setVodFilename] = useState("");
  const [vodPath, setVodPath] = useState("");
  const [recDate, setRecDate] = useState("");
  const [recHour, setRecHour] = useState(12);
  const [recMinute, setRecMinute] = useState(0);
  const [recSecond, setRecSecond] = useState(0);

  // Computed cuts
  const [cuts, setCuts] = useState<CutEntry[]>([]);

  /** Fetch sets from start.gg and populate station list + set rows. */
  const handleFetch = useCallback(async () => {
    const parsed = parseSlug(slug);
    if (!parsed) {
      setStatus("Invalid slug. Use format: tournament/xxx/event/yyy");
      return;
    }

    setLoading(true);
    setStatus("Fetching...");
    setCuts([]);

    try {
      const data = await fetchEventSets(parsed);
      setEventData(data);

      const stationList = getStationNumbers(data);
      setStations(stationList);

      const firstStation = stationList[0] ?? null;
      setSelectedStation(firstStation);

      const sets = getSetsByStation(data, firstStation);
      setSetRows(buildSetRows(sets, tournamentName));

      setStatus(
        `Loaded ${data.event.sets.nodes.length} sets. Stations: ${stationList.join(", ") || "none"}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [slug, tournamentName]);

  /** Re-filter sets when the station selection changes. */
  const handleStationChange = useCallback(
    (station: number | null) => {
      setSelectedStation(station);
      setCuts([]);
      if (eventData) {
        const sets = getSetsByStation(eventData, station);
        setSetRows(buildSetRows(sets, tournamentName));
      }
    },
    [eventData, tournamentName]
  );

  /** Handle VOD file pick: read filename for timestamp auto-detection. */
  const handleFilePicked = useCallback((filename: string, fullPath: string) => {
    setVodFilename(filename);
    setVodPath(fullPath);

    const parsed = parseRecordingStartFromFilename(filename);
    if (parsed) {
      setRecDate(
        `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
      );
      setRecHour(parsed.getHours());
      setRecMinute(parsed.getMinutes());
      setRecSecond(parsed.getSeconds());
    }
  }, []);

  /** Update a single set row's state. */
  const handleRowChange = useCallback(
    (index: number, patch: Partial<SetRowState>) => {
      setSetRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
      );
    },
    []
  );

  /** Compute cuts from the current set rows + recording start. */
  const handleComputeCuts = useCallback(() => {
    if (!setRows.length) {
      setStatus("Fetch sets first.");
      return;
    }

    // Block if any checked set has a suspiciously long duration
    const WARN_SECONDS = 45 * 60;
    const badSets = setRows.filter(
      (r) => r.checked && r.durationMinutes * 60 + r.durationSeconds > WARN_SECONDS
    );
    if (badSets.length > 0) {
      setStatus(
        `${badSets.length} set(s) have durations over 45 minutes -- fix or uncheck them before computing.`
      );
      return;
    }

    const [year, month, day] = recDate.split("-").map(Number);
    if (!year || !month || !day) {
      setStatus("Set a valid recording start date.");
      return;
    }

    const recordingStart = localPartsToDate(
      year, month, day, recHour, recMinute, recSecond
    );

    const computed = computeCuts(setRows, recordingStart);
    setCuts(computed);

    const selected = setRows.filter((r) => r.checked).length;
    setStatus(`Computed ${computed.length} cuts from ${selected} selected set(s).`);
  }, [setRows, recDate, recHour, recMinute, recSecond]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <WelcomeModal />

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          start.gg VOD Splitter
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Split tournament VODs into per-set clips using start.gg timestamps.
        </p>
      </div>

      <EventInput
        slug={slug}
        onSlugChange={setSlug}
        tournamentName={tournamentName}
        onTournamentNameChange={setTournamentName}
        onFetch={handleFetch}
        loading={loading}
        status={status}
      />

      {eventData && (
        <div className="flex items-end gap-4 overflow-x-auto">
          <StationSelector
            stations={stations}
            selected={selectedStation}
            onChange={handleStationChange}
          />
          <RecordingStart
            date={recDate}
            hour={recHour}
            minute={recMinute}
            second={recSecond}
            onDateChange={setRecDate}
            onHourChange={setRecHour}
            onMinuteChange={setRecMinute}
            onSecondChange={setRecSecond}
          />
        </div>
      )}

      {eventData && (
        <VodPicker
          vodFilename={vodFilename}
          vodPath={vodPath}
          onFilePicked={handleFilePicked}
        />
      )}

      {eventData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">
              Sets &mdash; Station {selectedStation ?? "all"}
            </h2>
            <button
              onClick={handleComputeCuts}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm text-white rounded transition-colors"
            >
              Compute Cuts
            </button>
          </div>
          <SetList
            rows={setRows}
            onRowChange={handleRowChange}
            stationLabel={selectedStation?.toString() ?? ""}
          />
        </div>
      )}

      {cuts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-300">Computed Cuts</h2>
          <CutList cuts={cuts} />
        </div>
      )}

      {cuts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-300">Split</h2>
          <SplitPanel cuts={cuts} vodPath={vodPath} />
        </div>
      )}
    </main>
  );
}
