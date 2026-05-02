/**
 * Local leaderboard backed by localStorage.
 *
 * Stores up to MAX_STORED (500) entries — display layer shows top 100 with
 * scroll, and the player's actual rank is reported even if they're outside
 * the visible 100 (e.g. "#487"). Per-name dedup keeps only each player's
 * best run.
 *
 * Persists per-browser. Swap `submitScore`/`getLeaderboard` to a remote
 * endpoint (Firebase, Supabase, JSONbin) when ready to make truly global —
 * the rest of the UI works unchanged.
 */

export interface ScoreEntry {
  name: string;
  distance: number;
  coins: number;
  date: number;
}

// v2: bumped from v1 (top-10) to top-100 with seed-of-100. Old v1 data is
// dropped so the seed reflects the new size.
// v5: 10 plausible Western seed names with REASONABLE distances so a
// real player can beat them on a normal run. (v4 had 12 names + huge
// 14000m top distance — felt rigged.)
const KEY_BOARD = "67runner.leaderboard.v5";
const KEY_NAME = "67runner.username";
const MAX_STORED = 500;
const DISPLAY_LIMIT = 100;

/** Hand-picked seed: 10 entries, top score ~2.2 km, last ~420 m.
 *  Real players easily slot in. Names are common Western first names
 *  so the board doesn't read as "rigged with city names". */
const SEED: ScoreEntry[] = [
  { name: "MAV",    distance: 2240, coins: 80, date: Date.now() - 86400000 * 1 },
  { name: "67KID",  distance: 1880, coins: 67, date: Date.now() - 86400000 * 2 },
  { name: "ETHAN",  distance: 1520, coins: 54, date: Date.now() - 86400000 * 3 },
  { name: "EMMA",   distance: 1290, coins: 46, date: Date.now() - 86400000 * 4 },
  { name: "LIAM",   distance: 1095, coins: 39, date: Date.now() - 86400000 * 5 },
  { name: "OLIVIA", distance:  925, coins: 33, date: Date.now() - 86400000 * 6 },
  { name: "NOAH",   distance:  780, coins: 27, date: Date.now() - 86400000 * 7 },
  { name: "AVA",    distance:  660, coins: 23, date: Date.now() - 86400000 * 8 },
  { name: "MAX",    distance:  540, coins: 19, date: Date.now() - 86400000 * 9 },
  { name: "SOPHIA", distance:  420, coins: 15, date: Date.now() - 86400000 * 10 },
];

export function getLeaderboard(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY_BOARD);
    if (raw) {
      const parsed = JSON.parse(raw) as ScoreEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore parse errors */
  }
  saveLeaderboard(SEED);
  return SEED.slice();
}

function saveLeaderboard(entries: ScoreEntry[]) {
  try {
    localStorage.setItem(KEY_BOARD, JSON.stringify(entries.slice(0, MAX_STORED)));
  } catch {
    /* quota or disabled */
  }
}

/**
 * Submit a new score. Returns:
 *  - `board`: the visible top-100 (sorted, deduped by name)
 *  - `rank`:  player's true rank in the full stored list (1-based; can be
 *             > 100 if they're outside the visible board, or null only on
 *             completely empty input)
 *  - `totalPlayers`: how many entries the stored board currently holds
 */
export function submitScore(entry: ScoreEntry): {
  board: ScoreEntry[];
  rank: number | null;
  totalPlayers: number;
} {
  const all = getLeaderboard();
  // Replace existing entry by same name if our new one is better; otherwise
  // keep the existing best (so a worse run doesn't demote you).
  const existingIdx = all.findIndex(
    (e) => e.name.toUpperCase() === entry.name.toUpperCase()
  );
  if (existingIdx >= 0) {
    if (entry.distance > all[existingIdx].distance) {
      all[existingIdx] = entry;
    }
  } else {
    all.push(entry);
  }
  all.sort((a, b) => b.distance - a.distance);
  const stored = all.slice(0, MAX_STORED);
  saveLeaderboard(stored);
  const rankIdx = stored.findIndex(
    (e) => e.name.toUpperCase() === entry.name.toUpperCase()
  );
  return {
    board: stored.slice(0, DISPLAY_LIMIT),
    rank: rankIdx >= 0 ? rankIdx + 1 : null,
    totalPlayers: stored.length,
  };
}

export function getUsername(): string {
  try {
    return localStorage.getItem(KEY_NAME) || "";
  } catch {
    return "";
  }
}

export function setUsername(name: string): void {
  try {
    localStorage.setItem(KEY_NAME, name);
  } catch {
    /* ignore */
  }
}

/** Sanitize a user-typed name to safe characters, max 14 chars. */
export function sanitizeName(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9_\- ]/g, "")
    .trim()
    .slice(0, 14);
  return cleaned || "GUEST";
}

/**
 * Render the top-100 board into a target <ol>. If `highlightName` matches a
 * row in the visible 100, that row gets the "me" style and the list scrolls
 * to it.
 */
export function renderLeaderboard(
  listEl: HTMLElement,
  board: ScoreEntry[],
  highlightName?: string
): void {
  listEl.innerHTML = "";
  const hl = highlightName?.toUpperCase();
  let highlightedRow: HTMLLIElement | null = null;
  for (let i = 0; i < Math.min(DISPLAY_LIMIT, board.length); i++) {
    const e = board[i];
    const li = document.createElement("li");
    const rank = i + 1;
    const isMe = !!hl && e.name.toUpperCase() === hl;
    li.className =
      "leaderboard-row" +
      (rank === 1 ? " gold" : rank === 2 ? " silver" : rank === 3 ? " bronze" : "") +
      (isMe ? " me" : "");
    const rankEl = document.createElement("span");
    rankEl.className = "leaderboard-rank";
    rankEl.textContent = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
    const nameEl = document.createElement("span");
    nameEl.className = "leaderboard-name";
    nameEl.textContent = e.name;
    const distEl = document.createElement("span");
    distEl.className = "leaderboard-dist";
    distEl.textContent = formatDistance(e.distance);
    li.appendChild(rankEl);
    li.appendChild(nameEl);
    li.appendChild(distEl);
    listEl.appendChild(li);
    if (isMe) highlightedRow = li;
  }
  // Auto-scroll to the player's row so they don't have to hunt for it
  if (highlightedRow) {
    setTimeout(() => {
      highlightedRow!.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  }
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.floor(m)} m`;
}
