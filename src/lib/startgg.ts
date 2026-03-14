/**
 * start.gg GraphQL client.
 *
 * Fetches event sets via the Rust backend (Tauri invoke),
 * filters by station, and builds display names from entrant/character data.
 */

import type { EventData, SetNode } from "./types";

/** GraphQL query for fetching all sets in an event with station + game data. */
const EVENT_SETS_QUERY = `
query EventQuery($slug: String!, $page: Int!) {
  event(slug: $slug) {
    id
    name
    sets(page: $page, perPage: 50, sortType: RECENT) {
      pageInfo { totalPages }
      nodes {
        id
        startedAt
        completedAt
        fullRoundText
        winnerId
        station { number }
        games {
          selections {
            entrant { id name }
            character { name }
          }
        }
      }
    }
  }
}
`;

const MAX_RETRIES = 5;

/**
 * Extract the slug pattern (tournament/xxx/event/yyy) from a URL or raw slug.
 * Returns the cleaned slug or null if the input looks like a URL but has no match.
 */
export function parseSlug(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/tournament\/[^/\s]+\/event\/[^/\s]+/);
  if (match) return match[0];

  // If it looks like a URL but we couldn't extract the pattern, it's invalid
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return null;
  }

  // Assume it's already a bare slug
  return trimmed || null;
}

/**
 * Fetch all sets for an event from start.gg, with pagination and retries.
 * Calls the Rust backend directly via Tauri invoke (no CORS issues).
 */
export async function fetchEventSets(slug: string): Promise<EventData> {
  const { invoke } = await import("@tauri-apps/api/core");

  let page = 1;
  let totalPages = 1;
  let eventInfo: { id?: number; name?: string } | null = null;
  const allNodes: SetNode[] = [];

  while (page <= totalPages) {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const out: Record<string, unknown> = await invoke("fetch_startgg", {
          slug,
          page,
        });

        if ((out as { errors?: unknown[] }).errors?.length) {
          throw new Error(
            "GraphQL errors: " +
              JSON.stringify((out as { errors: unknown[] }).errors)
          );
        }

        const data = (out as { data?: { event?: Record<string, unknown> } })
          .data;
        if (!data?.event) {
          throw new Error("No event found. Check your event slug.");
        }

        const ev = data.event as Record<string, unknown>;
        if (!eventInfo) {
          eventInfo = {
            id: ev.id as number | undefined,
            name: ev.name as string | undefined,
          };
        }

        const setsContainer = (ev.sets ?? {}) as {
          pageInfo?: { totalPages?: number };
          nodes?: SetNode[];
        };
        totalPages = setsContainer.pageInfo?.totalPages ?? 1;
        const nodes: SetNode[] = setsContainer.nodes ?? [];
        allNodes.push(...nodes);

        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Don't retry on known bad input
        if (lastError.message.includes("No event found")) throw lastError;
        if (lastError.message.includes("GraphQL errors")) throw lastError;
      }
    }

    if (lastError) {
      throw new Error(`Request failed after ${MAX_RETRIES} retries: ${lastError.message}`);
    }

    page++;
  }

  return {
    event: {
      ...(eventInfo ?? {}),
      sets: { nodes: allNodes },
    },
  };
}

/**
 * Filter sets by station number and sort by startedAt.
 * Only includes sets that have both startedAt and completedAt timestamps.
 */
export function getSetsByStation(
  data: EventData,
  stationNumber: number | null
): SetNode[] {
  let nodes = data.event.sets.nodes;

  // Filter to selected station
  if (stationNumber !== null) {
    nodes = nodes.filter((n) => n.station?.number === stationNumber);
  }

  // Only keep sets with both timestamps (same as Python version)
  nodes = nodes.filter((n) => n.startedAt != null && n.completedAt != null);

  // Sort chronologically by start time
  nodes.sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));

  return nodes;
}

/**
 * Extract unique station numbers from the event data.
 */
export function getStationNumbers(data: EventData): number[] {
  const stations = new Set<number>();
  for (const node of data.event.sets.nodes) {
    if (node.station?.number != null) {
      stations.add(node.station.number);
    }
  }
  return Array.from(stations).sort((a, b) => a - b);
}

/**
 * Build a display name for a set from entrant + character data.
 * Format: "Player1 (CharA) vs. Player2 (CharB)"
 */
export function setDisplayName(setNode: SetNode): string {
  const games = setNode.games ?? [];
  if (!games.length) return `Set ${setNode.id ?? "?"}`;

  // Use first game's selections for the label
  const selections = games[0]?.selections ?? [];
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const sel of selections) {
    const entrant = sel.entrant?.name ?? "?";
    const character = sel.character?.name ?? "?";
    if (seen.has(entrant)) continue;
    seen.add(entrant);
    parts.push(`${entrant} (${character})`);
  }

  return parts.length ? parts.join(" vs. ") : `Set ${setNode.id ?? "?"}`;
}
