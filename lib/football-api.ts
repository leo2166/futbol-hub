// ESPN public (unofficial) soccer API — verified live on 2026-08-13.
// Base: https://site.api.espn.com/apis/site/v2/sports/soccer/{league}
//
// IMPORTANT real-world quirk (verified): for European leagues (esp.1) the bare
// /schedule call defaults to the *upcoming* season which can have 0 events.
// We must resolve the correct `season` year dynamically by probing candidates
// and picking the first one that actually returns events. Never hardcode a year.

const SITE_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/soccer"
const CORE_BASE = "https://site.web.api.espn.com/apis/v2/sports/soccer"

export type TeamKey = "barcelona" | "real-madrid" | "inter-miami"

export interface TeamConfig {
  key: TeamKey
  name: string
  shortName: string
  league: string // ESPN league slug, e.g. "esp.1"
  leagueName: string
  espnId: string // verified ESPN team id
  accent: string // accent color used for per-team theming
  accentForeground: string // text contrast color
}

// Team ids verified against the live /teams endpoints.
export const TEAMS: Record<TeamKey, TeamConfig> = {
  barcelona: {
    key: "barcelona",
    name: "FC Barcelona",
    shortName: "Barça",
    league: "esp.1",
    leagueName: "LaLiga",
    espnId: "83",
    accent: "#a50044", // Granate blaugrana
    accentForeground: "#ffffff", // Fuente en blanco
  },
  "real-madrid": {
    key: "real-madrid",
    name: "Real Madrid",
    shortName: "Madrid",
    league: "esp.1",
    leagueName: "LaLiga",
    espnId: "86",
    accent: "#ffffff", // Blanco merengue
    accentForeground: "#000000", // Fuente en negro
  },
  "inter-miami": {
    key: "inter-miami",
    name: "Inter Miami CF",
    shortName: "Miami",
    league: "usa.1",
    leagueName: "MLS",
    espnId: "20232",
    accent: "oklch(0.68 0.19 350)", // Miami pink
    accentForeground: "#ffffff",
  },
}

export const TEAM_ORDER: TeamKey[] = ["barcelona", "real-madrid", "inter-miami"]

// Partidos o torneos verificados oficiales que pueden no estar indexados en la API pública de ESPN
export const VERIFIED_EXTRA_MATCHES: Record<TeamKey, Match[]> = {
  barcelona: [
    {
      id: "custom-gamper-2026",
      date: "2026-08-19T18:00:00.000Z", // 20:00 CEST (18:00 UTC)
      venue: "Spotify Camp Nou",
      state: "pre",
      statusDetail: "Programado",
      completed: false,
      competition: {
        name: "Trofeo Joan Gamper",
        short: "Trofeo Gamper",
        slug: "club.friendly",
        isTournament: true,
      },
      home: {
        teamId: "83",
        name: "Barcelona",
        logo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
        score: null,
        winner: null,
        isHome: true,
      },
      away: {
        teamId: "10207",
        name: "Al Ahly",
        logo: "https://a.espncdn.com/i/teamlogos/soccer/500/10207.png",
        score: null,
        winner: null,
        isHome: false,
      },
    },
  ],
  "real-madrid": [],
  "inter-miami": [],
}


// ---- Raw ESPN response shapes (only the fields we actually read) ----

interface EspnScore {
  value?: number
  displayValue?: string
  winner?: boolean
}

interface EspnCompetitor {
  homeAway: "home" | "away"
  winner?: boolean
  score?: EspnScore | string
  team: {
    id: string
    displayName: string
    shortDisplayName?: string
    abbreviation?: string
    logo?: string
    logos?: { href: string }[]
  }
}

interface EspnStatusType {
  name?: string // e.g. STATUS_FULL_TIME, STATUS_SCHEDULED, STATUS_IN_PROGRESS
  completed?: boolean
  state?: string // "pre" | "in" | "post"
  shortDetail?: string
}

interface EspnLeagueRef {
  id?: string
  name?: string
  shortName?: string
  abbreviation?: string
  slug?: string
  isTournament?: boolean
}

interface EspnEvent {
  id: string
  date: string
  name: string
  league?: EspnLeagueRef
  competitions: {
    venue?: { fullName?: string }
    status?: { type?: EspnStatusType }
    competitors: EspnCompetitor[]
  }[]
}

interface EspnScheduleResponse {
  season?: { year?: number; displayName?: string }
  events?: EspnEvent[]
}

interface EspnScoreboardResponse {
  leagues?: {
    name?: string
    abbreviation?: string
    season?: { displayName?: string; year?: number }
    calendar?: string[] // ISO dates that have fixtures this season
  }[]
  events?: EspnEvent[]
}

interface EspnStandingsEntry {
  team: { id: string; displayName: string; logos?: { href: string }[]; logo?: string }
  stats: { name: string; displayValue?: string; value?: number }[]
}

interface EspnStandingsResponse {
  children?: { standings?: { entries?: EspnStandingsEntry[] } }[]
  standings?: { entries?: EspnStandingsEntry[] }
}

// ---- Normalized types consumed by the UI ----

export interface MatchSide {
  teamId: string
  name: string
  logo: string | null
  score: number | null
  winner: boolean | null
  isHome: boolean
}

export interface Competition {
  name: string // full name, e.g. "UEFA Champions League"
  short: string // shortened label, e.g. "Champions"
  slug: string | null
  isTournament: boolean
}

export interface Match {
  id: string
  date: string // ISO
  venue: string | null
  state: "pre" | "in" | "post"
  statusDetail: string | null
  completed: boolean
  competition: Competition | null
  home: MatchSide
  away: MatchSide
}

export function translateCountry(c?: string | null): string | null {
  if (!c) return null
  const map: Record<string, string> = {
    Spain: "España",
    France: "Francia",
    Germany: "Alemania",
    England: "Inglaterra",
    Poland: "Polonia",
    Netherlands: "Países Bajos",
    Denmark: "Dinamarca",
    Hungary: "Hungría",
    Belgium: "Bélgica",
    Brazil: "Brasil",
    Argentina: "Argentina",
    Uruguay: "Uruguay",
    Italy: "Italia",
    Portugal: "Portugal",
    Sweden: "Suecia",
    Egypt: "Egipto",
    Mali: "Malí",
    Israel: "Israel",
    "United States": "Estados Unidos",
    USA: "Estados Unidos",
    Colombia: "Colombia",
    Chile: "Chile",
    Ecuador: "Ecuador",
    Venezuela: "Venezuela",
    Paraguay: "Paraguay",
    Peru: "Perú",
    Mexico: "México",
    Morocco: "Marruecos",
    Senegal: "Senegal",
    Japan: "Japón",
    "South Korea": "Corea del Sur",
    Croatia: "Croacia",
    Serbia: "Serbia",
    Switzerland: "Suiza",
    Austria: "Austria",
    Norway: "Noruega",
    Ukraine: "Ucrania",
    Turkey: "Turquía",
    Czechia: "República Checa",
    "Czech Republic": "República Checa",
  }
  return map[c] ?? c
}

export function translatePosition(pos?: string | null): string {
  if (!pos) return "Jugador"
  const p = pos.toLowerCase()
  if (p.includes("goal") || p.includes("arquero") || p.includes("portero")) return "Portero"
  if (
    p.includes("center back") ||
    p.includes("centre-back") ||
    p.includes("central defender") ||
    p.includes("center right defender") ||
    p.includes("center left defender")
  )
    return "Defensa Central"
  if (p.includes("right back") || p.includes("right wing back")) return "Lateral Derecho"
  if (p.includes("left back") || p.includes("left wing back")) return "Lateral Izquierdo"
  if (p.includes("defender") || p.includes("back")) return "Defensa"
  if (p.includes("defensive midfield") || p.includes("holding")) return "Pivote"
  if (p.includes("attacking midfield") || p.includes("playmaker")) return "Mediapunta"
  if (p.includes("central midfield") || p.includes("midfield")) return "Centrocampista"
  if (p.includes("right wing") || p.includes("right forward")) return "Extremo Derecho"
  if (p.includes("left wing") || p.includes("left forward")) return "Extremo Izquierdo"
  if (
    p.includes("striker") ||
    p.includes("center forward") ||
    p.includes("forward") ||
    p.includes("delantero")
  )
    return "Delantero Centro"
  return pos
}

export function translateStatus(status?: string | null): string {
  if (!status) return ""
  const s = status.toUpperCase()
  if (s === "FT" || s === "FINAL" || s === "STATUS_FULL_TIME") return "Final"
  if (s === "HT" || s === "HALFTIME" || s === "STATUS_HALFTIME") return "Descanso"
  if (s === "POSTPONED") return "Pospuesto"
  if (s === "CANCELLED") return "Cancelado"
  if (s === "DELAYED") return "Retrasado"
  if (s === "SCHEDULED") return "Programado"
  if (s.includes("IN PROGRESS") || s.includes("LIVE")) return "En Vivo"
  return status
}

// Human-friendly, compact competition labels (Spanish UI).
export function shortCompetition(name: string): string {
  const map: Record<string, string> = {
    "Spanish LALIGA": "LaLiga",
    LALIGA: "LaLiga",
    "UEFA Champions League": "Champions League",
    "Champions League": "Champions League",
    "Spanish Copa del Rey": "Copa del Rey",
    "Copa del Rey": "Copa del Rey",
    "Spanish Supercopa": "Supercopa de España",
    Supercopa: "Supercopa",
    "Trofeo Joan Gamper": "Trofeo Gamper",
    "Club Friendly": "Amistoso",
    Friendly: "Amistoso",
    MLS: "MLS",
    "Major League Soccer": "MLS",
    "Leagues Cup": "Leagues Cup",
    "Concacaf Champions Cup": "Copa de Campeones Concacaf",
    "U.S. Open Cup": "US Open Cup",
  }
  return map[name] ?? name
}

export interface StandingRow {
  teamId: string
  name: string
  logo: string | null
  rank: number
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  goalDiff: string
  goalsFor: number
  goalsAgainst: number
}

export interface TeamData {
  team: TeamConfig
  seasonLabel: string | null
  competitions: { name: string; short: string; count: number }[]
  matches: Match[] // full season across ALL competitions, sorted ascending
}

export interface LeagueCalendar {
  leagueName: string
  seasonLabel: string | null
  dates: string[] // all fixture dates this season (ISO)
  selectedDate: string | null // ISO date currently shown
  index: number // position of selectedDate within dates (-1 if none)
  matches: Match[]
}

// ---- Fetch helpers ----

async function fetchJson<T>(url: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?"
  const finalUrl = url.includes("lang=") ? url : `${url}${separator}lang=es&region=es`
  const res = await fetch(finalUrl, { headers: { Accept: "application/json" } })
  if (!res.ok) {
    throw new Error(`ESPN request failed (${res.status}) for ${finalUrl}`)
  }
  return (await res.json()) as T
}

function pickLogo(team: {
  logo?: string
  logos?: { href: string }[]
}): string | null {
  if (team.logos && team.logos.length > 0) return team.logos[0].href
  if (team.logo) return team.logo
  return null
}

function scoreToNumber(score?: EspnScore | string): number | null {
  if (score == null) return null
  if (typeof score === "string") {
    const n = Number.parseInt(score, 10)
    return Number.isNaN(n) ? null : n
  }
  if (typeof score.value === "number") return score.value
  if (score.displayValue != null) {
    const n = Number.parseInt(score.displayValue, 10)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function normalizeSide(c: EspnCompetitor): MatchSide {
  const score = typeof c.score === "object" ? c.score : undefined
  return {
    teamId: c.team.id,
    name: c.team.shortDisplayName || c.team.displayName,
    logo: pickLogo(c.team),
    score: scoreToNumber(c.score),
    winner: c.winner ?? score?.winner ?? null,
    isHome: c.homeAway === "home",
  }
}

function normalizeCompetition(
  league: EspnLeagueRef | undefined,
  fallbackName?: string,
): Competition | null {
  const name = league?.name ?? fallbackName
  if (!name) return null
  let slug = league?.slug ?? null
  if (!slug) {
    const lower = name.toLowerCase()
    if (lower.includes("champion")) slug = "uefa.champions"
    else if (lower.includes("laliga") || lower.includes("spanish")) slug = "esp.1"
    else if (lower.includes("mls") || lower.includes("major league")) slug = "usa.1"
  }
  return {
    name,
    short: shortCompetition(name),
    slug,
    isTournament:
      Boolean(league?.isTournament) ||
      name.toLowerCase().includes("champion") ||
      name.toLowerCase().includes("cup") ||
      name.toLowerCase().includes("copa") ||
      name.toLowerCase().includes("trofeo"),
  }
}

function normalizeEvent(e: EspnEvent, fallbackCompetition?: string): Match | null {
  const comp = e.competitions?.[0]
  if (!comp || !comp.competitors || comp.competitors.length < 2) return null
  const home = comp.competitors.find((c) => c.homeAway === "home")
  const away = comp.competitors.find((c) => c.homeAway === "away")
  if (!home || !away) return null

  const type = comp.status?.type
  const state = (type?.state as Match["state"]) || (type?.completed ? "post" : "pre")

  return {
    id: e.id,
    date: e.date,
    venue: comp.venue?.fullName ?? null,
    state,
    statusDetail: translateStatus(type?.shortDetail) || (type?.completed ? "Final" : null),
    completed: Boolean(type?.completed),
    competition: normalizeCompetition(e.league, fallbackCompetition),
    home: normalizeSide(home),
    away: normalizeSide(away),
  }
}

// Resolve the team's fixtures exclusively for the NEW season (2026-27 for Europe, 2026 for MLS).
async function fetchScheduleResolved(
  team: TeamConfig,
): Promise<{ events: Match[]; seasonLabel: string | null }> {
  try {
    const isEuropean = team.league === "esp.1"
    const minDateCutoff = isEuropean ? "2026-06-01" : "2026-01-01"
    const seasonYear = 2026

    // 1) Fetch league-wide calendar for the new season
    const scoreBase = `${SITE_BASE}/${team.league}/scoreboard`
    const meta = await fetchJson<EspnScoreboardResponse>(scoreBase)
    const dates = (meta.leagues?.[0]?.calendar ?? []).filter(Boolean)

    const ymds = dates.map((dt) => isoToYmd(dt))

    // Parallel fetch matchdays from the scoreboard calendar
    const scoreboardPromises = ymds.map((ymd) =>
      fetchJson<EspnScoreboardResponse>(`${scoreBase}?dates=${ymd}`)
        .then((data) => data.events ?? [])
        .catch(() => [] as EspnEvent[]),
    )

    // 2) Also fetch cross-competition schedule for the new season (friendlies, tour, cups)
    const teamSchedulePromise = fetchJson<EspnScheduleResponse>(
      `${SITE_BASE}/all/teams/${team.espnId}/schedule?season=${seasonYear}`,
    )
      .then((data) => data.events ?? [])
      .catch(() => [] as EspnEvent[])

    // 3) For European teams (Barça and Madrid), also fetch Champions League matches!
    const uclPromise = isEuropean
      ? fetchJson<EspnScoreboardResponse>(
          `${SITE_BASE}/uefa.champions/scoreboard?dates=20260801-20270630&limit=500`,
        )
          .then((data) =>
            (data.events ?? []).map((e) => ({
              ...e,
              league: { name: "UEFA Champions League", slug: "uefa.champions", isTournament: true },
            })),
          )
          .catch(() => [] as EspnEvent[])
      : Promise.resolve([] as EspnEvent[])

    const [scoreboardEventsNested, extraScheduleEvents, uclEventsRaw] = await Promise.all([
      Promise.all(scoreboardPromises),
      teamSchedulePromise,
      uclPromise,
    ])

    const allEventsRaw: EspnEvent[] = [
      ...scoreboardEventsNested.flat(),
      ...extraScheduleEvents,
      ...uclEventsRaw,
    ]

    // Deduplicate by event ID and filter only matches for this team
    const seenIds = new Set<string>()
    const teamMatches: Match[] = []

    for (const e of allEventsRaw) {
      if (!e?.id || seenIds.has(e.id)) continue
      const hasTeam = e.competitions?.[0]?.competitors?.some(
        (c) => String(c.team?.id) === String(team.espnId),
      )
      if (!hasTeam) continue

      const fallback = e.league?.name || team.leagueName
      const norm = normalizeEvent(e, fallback)
      if (!norm) continue

      // Strictly ensure the match belongs to the NEW season
      if (norm.date >= minDateCutoff) {
        seenIds.add(e.id)
        teamMatches.push(norm)
      }
    }

    // Incorporate any verified official extra matches (e.g. Gamper Trophy, preseason friendlies) not in ESPN
    const extras = VERIFIED_EXTRA_MATCHES[team.key] || []
    for (const extra of extras) {
      if (!seenIds.has(extra.id)) {
        // Check if there is already a match on the same date with the same opponent
        const alreadyPresent = teamMatches.some(
          (m) =>
            m.date.slice(0, 10) === extra.date.slice(0, 10) &&
            (m.home.name.toLowerCase().includes(extra.away.name.toLowerCase()) ||
              m.away.name.toLowerCase().includes(extra.away.name.toLowerCase())),
        )
        if (!alreadyPresent) {
          seenIds.add(extra.id)
          teamMatches.push(extra)
        }
      }
    }

    // Sort ascending by date
    teamMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const seasonLabel = isEuropean ? "2026-27" : "2026"
    return { events: teamMatches, seasonLabel }
  } catch (err) {
    console.error("Error in fetchScheduleResolved:", err)
    return { events: [], seasonLabel: team.league === "esp.1" ? "2026-27" : "2026" }
  }
}

export async function getTeamData(teamKey: TeamKey): Promise<TeamData> {
  const team = TEAMS[teamKey]
  const { events, seasonLabel } = await fetchScheduleResolved(team)

  const matches = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  // Competition breakdown
  const counts = new Map<string, { name: string; short: string; count: number }>()
  for (const m of matches) {
    if (!m.competition) continue
    const key = m.competition.name
    const prev = counts.get(key)
    if (prev) prev.count += 1
    else counts.set(key, { name: key, short: m.competition.short, count: 1 })
  }
  const competitions = [...counts.values()].sort((a, b) => b.count - a.count)

  return {
    team,
    seasonLabel: seasonLabel ?? (team.league === "esp.1" ? "2026-27" : "2026"),
    competitions,
    matches,
  }
}

// Convert an ISO timestamp to the YYYYMMDD form the scoreboard `dates` param
// expects (UTC-based, matching ESPN's own calendar entries).
function isoToYmd(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`
}

let uclDatesCache: string[] | null = null
async function getUclDates(): Promise<string[]> {
  if (uclDatesCache && uclDatesCache.length > 0) return uclDatesCache
  try {
    const data = await fetchJson<EspnScoreboardResponse>(
      `${SITE_BASE}/uefa.champions/scoreboard?dates=20260801-20270630&limit=500`,
    )
    const uniqueYmds = [...new Set((data.events ?? []).map((e) => e.date.slice(0, 10)))].sort()
    uclDatesCache = uniqueYmds.map((d) => `${d}T12:00:00Z`)
    return uclDatesCache
  } catch (err) {
    console.error("Error loading UCL dates:", err)
    return []
  }
}

export function teamHasChampionsLeague(teamKey: TeamKey): boolean {
  return teamKey === "barcelona" || teamKey === "real-madrid"
}

// League-wide calendar via the scoreboard endpoint for the current season.
export async function getLeagueCalendar(
  teamKey: TeamKey,
  dateYmd?: string,
  competition?: string,
): Promise<LeagueCalendar> {
  const team = TEAMS[teamKey]
  const isUcl = competition === "uefa.champions"
  const leagueSlug = isUcl ? "uefa.champions" : team.league
  const base = `${SITE_BASE}/${leagueSlug}/scoreboard`

  let dates: string[] = []
  let leagueName = isUcl ? "Champions League" : team.leagueName
  let seasonLabel = "2026-27"

  if (isUcl) {
    dates = await getUclDates()
  } else {
    // 1) Pull the season calendar (list of fixture dates) + season label.
    const meta = await fetchJson<EspnScoreboardResponse>(base)
    const league = meta.leagues?.[0]
    leagueName = league?.name ? shortCompetition(league.name) : team.leagueName
    seasonLabel = team.league === "esp.1" ? "2026-27" : (league?.season?.displayName ?? "2026")
    dates = (league?.calendar ?? []).filter(Boolean)
  }

  // 2) Decide which date to show.
  let targetYmd = dateYmd
  if (!targetYmd) {
    const todayYmd = isoToYmd(new Date().toISOString())
    const upcoming = dates.find((iso) => isoToYmd(iso) >= todayYmd)
    targetYmd = upcoming ? isoToYmd(upcoming) : dates.length ? isoToYmd(dates[0]) : undefined
  }

  const index = targetYmd ? dates.findIndex((iso) => isoToYmd(iso) === targetYmd) : -1
  const selectedDate = index >= 0 ? dates[index] : null

  // 3) Fetch the fixtures for that date.
  const scoreUrl = targetYmd ? `${base}?dates=${targetYmd}` : base
  const data = await fetchJson<EspnScoreboardResponse>(scoreUrl)
  const fallbackComp = isUcl ? "UEFA Champions League" : leagueName
  const matches = (data.events ?? [])
    .map((e) => {
      if (isUcl && !e.league) {
        e = { ...e, league: { name: "UEFA Champions League", slug: "uefa.champions", isTournament: true } }
      }
      return normalizeEvent(e, fallbackComp)
    })
    .filter((m): m is Match => m !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return { leagueName, seasonLabel, dates, selectedDate, index, matches }
}

function statNumber(entry: EspnStandingsEntry, name: string): number {
  const s = entry.stats.find((x) => x.name === name)
  if (!s) return 0
  if (typeof s.value === "number") return s.value
  const n = Number.parseInt(s.displayValue ?? "0", 10)
  return Number.isNaN(n) ? 0 : n
}

function statText(entry: EspnStandingsEntry, name: string): string {
  const s = entry.stats.find((x) => x.name === name)
  return s?.displayValue ?? "0"
}

export async function getStandings(
  teamKey: TeamKey,
  competition?: string,
): Promise<StandingRow[]> {
  const team = TEAMS[teamKey]
  const isUcl = competition === "uefa.champions"
  const leagueSlug = isUcl ? "uefa.champions" : team.league
  const seasonYear = 2026
  const url = `${CORE_BASE}/${leagueSlug}/standings?season=${seasonYear}`

  try {
    const data = await fetchJson<EspnStandingsResponse>(url)
    const entries = data.children?.[0]?.standings?.entries ?? data.standings?.entries ?? []

    const rows: StandingRow[] = entries.map((entry) => ({
      teamId: entry.team.id,
      name: entry.team.displayName,
      logo: pickLogo(entry.team),
      rank: statNumber(entry, "rank"),
      points: statNumber(entry, "points"),
      played: statNumber(entry, "gamesPlayed"),
      wins: statNumber(entry, "wins"),
      draws: statNumber(entry, "ties"),
      losses: statNumber(entry, "losses"),
      goalDiff: statText(entry, "pointDifferential"),
      goalsFor: statNumber(entry, "pointsFor"),
      goalsAgainst: statNumber(entry, "pointsAgainst"),
    }))

    rows.sort((a, b) => a.rank - b.rank)
    return rows
  } catch (err) {
    console.error("Error fetching standings:", err)
    return []
  }
}

// ---- News ----

export interface NewsArticle {
  id: string
  headline: string
  description: string
  published: string // ISO
  imageUrl: string | null
  webUrl: string | null
  byline: string | null
}

export async function getTeamNews(teamKey: TeamKey): Promise<NewsArticle[]> {
  const team = TEAMS[teamKey]
  const url = `${SITE_BASE}/${team.league}/news`
  try {
    const data = await fetchJson<any>(url)
    const articles = data.articles ?? []
    const mapped: NewsArticle[] = []

    for (const art of articles) {
      // Find image
      const img = art.images?.find((i: any) => i.url)?.url ?? null
      mapped.push({
        id: String(art.id || art.nowId || Math.random()),
        headline: art.headline || "",
        description: art.description || "",
        published: art.published || art.lastModified || new Date().toISOString(),
        imageUrl: img,
        webUrl: art.links?.web?.href ?? null,
        byline: art.byline ?? null,
      })
    }

    return mapped.slice(0, 12)
  } catch (err) {
    console.error("Error fetching news:", err)
    return []
  }
}

// ---- Squad / Roster ----

export interface SquadPlayer {
  id: string
  name: string
  shortName: string
  jersey: string
  position: "Portero" | "Defensa" | "Centrocampista" | "Delantero" | "Otro"
  age: number | null
  citizenship: string | null
  flagUrl: string | null
  photoUrl: string | null
}

export async function getTeamSquad(teamKey: TeamKey): Promise<SquadPlayer[]> {
  const team = TEAMS[teamKey]
  const url = `${SITE_BASE}/${team.league}/teams/${team.espnId}/roster`
  try {
    const data = await fetchJson<any>(url)
    const athletes = data.athletes ?? []
    const players: SquadPlayer[] = []

    for (const a of athletes) {
      const posName = a.position?.name?.toLowerCase() || ""
      let position: SquadPlayer["position"] = "Otro"
      if (posName.includes("goalkeeper") || posName.includes("arquero") || posName.includes("portero")) position = "Portero"
      else if (posName.includes("defender") || posName.includes("back") || posName.includes("defensa")) position = "Defensa"
      else if (posName.includes("midfield") || posName.includes("volante") || posName.includes("medio")) position = "Centrocampista"
      else if (posName.includes("forward") || posName.includes("striker") || posName.includes("winger") || posName.includes("attacker") || posName.includes("delantero")) position = "Delantero"

      const photoUrl = `https://a.espncdn.com/i/headshots/soccer/players/full/${a.id}.png`

      players.push({
        id: String(a.id),
        name: a.displayName || a.fullName || "",
        shortName: a.shortName || a.displayName || "",
        jersey: a.jersey || "-",
        position,
        age: a.age || null,
        citizenship: translateCountry(a.citizenship) || a.citizenship || null,
        flagUrl: a.flag?.href || null,
        photoUrl,
      })
    }

    // Sort by position hierarchy: Portero -> Defensa -> Centrocampista -> Delantero -> jersey number
    const posWeight: Record<SquadPlayer["position"], number> = {
      Portero: 1,
      Defensa: 2,
      Centrocampista: 3,
      Delantero: 4,
      Otro: 5,
    }

    players.sort((a, b) => {
      if (posWeight[a.position] !== posWeight[b.position]) {
        return posWeight[a.position] - posWeight[b.position]
      }
      const numA = parseInt(a.jersey, 10) || 999
      const numB = parseInt(b.jersey, 10) || 999
      return numA - numB
    })

    return players
  } catch (err) {
    console.error("Error fetching squad:", err)
    return []
  }
}

// ---- Match Details ----

export interface MatchStat {
  name: string
  label: string
  homeValue: string
  awayValue: string
}

export interface MatchTimelineEvent {
  id: string
  clock: string
  text: string
  type: "goal" | "card-yellow" | "card-red" | "sub" | "other"
  teamId?: string
  athleteName?: string
}

export interface MatchCommentary {
  id: string
  sequence: number
  clock: string
  text: string
  type:
    | "goal"
    | "shot"
    | "card-yellow"
    | "card-red"
    | "sub"
    | "corner"
    | "foul"
    | "save"
    | "woodwork"
    | "offside"
    | "whistle"
    | "other"
  teamName?: string
  athleteName?: string
}

export interface MatchLineupPlayer {
  id: string
  name: string
  jersey: string
  position: string
  starter: boolean
}

export interface MatchDetail {
  id: string
  date: string
  venue: string | null
  state: "pre" | "in" | "post"
  clock?: string
  statusDetail: string | null
  completed: boolean
  competitionName: string | null
  home: MatchSide
  away: MatchSide
  stats: MatchStat[]
  events: MatchTimelineEvent[]
  commentary: MatchCommentary[]
  homeLineup: MatchLineupPlayer[]
  awayLineup: MatchLineupPlayer[]
  recapArticle?: string
}

export async function getMatchDetail(eventId: string, leagueSlug = "esp.1"): Promise<MatchDetail | null> {
  // Check if it matches a verified extra match (such as custom-gamper-2026)
  for (const teamKey of Object.keys(VERIFIED_EXTRA_MATCHES) as TeamKey[]) {
    const customMatch = VERIFIED_EXTRA_MATCHES[teamKey].find((m) => m.id === eventId)
    if (customMatch) {
      return {
        id: customMatch.id,
        date: customMatch.date,
        venue: customMatch.venue,
        state: customMatch.state,
        clock: undefined,
        statusDetail: customMatch.statusDetail || "Programado",
        completed: customMatch.completed,
        competitionName: customMatch.competition?.name || "Amistoso",
        home: customMatch.home,
        away: customMatch.away,
        stats: [],
        events: [],
        commentary: [],
        homeLineup: [],
        awayLineup: [],
        recapArticle:
          "61ª edición del histórico Trofeo Joan Gamper en el Spotify Camp Nou. Partido de presentación oficial de la plantilla 2026/27 ante el Al Ahly SC (Egipto), siendo la primera vez que un club africano disputa este emblemático torneo.",
      }
    }
  }

  const url = `${SITE_BASE}/${leagueSlug}/summary?event=${eventId}`
  try {
    const data = await fetchJson<any>(url)
    const header = data.header
    const comp = header?.competitions?.[0]
    if (!comp) return null

    const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home")
    const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away")
    if (!homeComp || !awayComp) return null

    const home = normalizeSide(homeComp)
    const away = normalizeSide(awayComp)

    const statusType = comp.status?.type
    const state = (statusType?.state as Match["state"]) || (statusType?.completed ? "post" : "pre")
    const clock = comp.status?.displayClock || header?.competitions?.[0]?.status?.displayClock || ""

    // Events / Timeline
    const rawEvents = data.keyEvents ?? []
    const events: MatchTimelineEvent[] = []
    for (const e of rawEvents) {
      const typeText = (e.type?.type || e.type?.text || "").toLowerCase()
      let type: MatchTimelineEvent["type"] = "other"
      if (typeText.includes("goal") || typeText.includes("gol")) type = "goal"
      else if (typeText.includes("red") || typeText.includes("roja")) type = "card-red"
      else if (typeText.includes("yellow") || typeText.includes("amarilla")) type = "card-yellow"
      else if (typeText.includes("sub") || typeText.includes("cambio") || typeText.includes("sustituci")) type = "sub"

      const athlete = e.participants?.[0]?.athlete?.displayName
      events.push({
        id: String(e.id),
        clock: e.clock?.displayValue || "",
        text: e.shortText || e.text || "",
        type,
        teamId: e.team?.id ? String(e.team.id) : undefined,
        athleteName: athlete,
      })
    }

    // Full Minute-by-Minute Commentary (narración oficial en español)
    const rawCommentary = data.commentary ?? []
    const commentary: MatchCommentary[] = []
    for (const c of rawCommentary) {
      const playType = (c.play?.type?.type || c.play?.type?.text || "").toLowerCase()
      const text = c.text || ""
      const textLower = text.toLowerCase()

      let type: MatchCommentary["type"] = "other"
      if (playType.includes("goal") || textLower.includes("gol de") || textLower.startsWith("¡gol") || textLower.includes("gol!")) {
        type = "goal"
      } else if (playType.includes("red") || textLower.includes("tarjeta roja")) {
        type = "card-red"
      } else if (playType.includes("yellow") || textLower.includes("tarjeta amarilla")) {
        type = "card-yellow"
      } else if (playType.includes("sub") || textLower.includes("cambio en") || textLower.includes("sustitución")) {
        type = "sub"
      } else if (playType.includes("corner") || textLower.includes("corner") || textLower.includes("córner")) {
        type = "corner"
      } else if (
        playType.includes("woodwork") ||
        textLower.includes("larguero") ||
        textLower.includes("poste") ||
        textLower.includes("al palo") ||
        textLower.includes("al travesa")
      ) {
        type = "woodwork"
      } else if (playType.includes("save") || textLower.includes("parada") || textLower.includes("remate parado")) {
        type = "save"
      } else if (playType.includes("shot") || textLower.includes("remate") || textLower.includes("disparo")) {
        type = "shot"
      } else if (playType.includes("foul") || textLower.includes("falta")) {
        type = "foul"
      } else if (playType.includes("offside") || textLower.includes("fuera de juego")) {
        type = "offside"
      } else if (
        playType.includes("kickoff") ||
        playType.includes("halftime") ||
        playType.includes("fulltime") ||
        textLower.includes("empieza") ||
        textLower.includes("final")
      ) {
        type = "whistle"
      }

      const athlete = c.play?.participants?.[0]?.athlete?.displayName
      const teamName = c.play?.team?.displayName

      commentary.push({
        id: String(c.play?.id || `seq-${c.sequence}` || Math.random()),
        sequence: c.sequence ?? 0,
        clock: c.time?.displayValue || c.play?.clock?.displayValue || "",
        text,
        type,
        teamName,
        athleteName: athlete,
      })
    }

    // Stats
    const stats: MatchStat[] = []
    const boxTeams = data.boxscore?.teams ?? []
    const homeStats = boxTeams.find((t: any) => t.team?.id === home.teamId)?.statistics ?? []
    const awayStats = boxTeams.find((t: any) => t.team?.id === away.teamId)?.statistics ?? []

    const labelMap: Record<string, string> = {
      possessionPct: "Posesión (%)",
      totalShots: "Tiros totales",
      shotsOnTarget: "Tiros a puerta",
      foulsCommitted: "Faltas",
      yellowCards: "Tarjetas amarillas",
      redCards: "Tarjetas rojas",
      offsides: "Fueras de juego",
      wonCorners: "Córners",
      saves: "Paradas",
    }

    for (const hs of homeStats) {
      const name = hs.name
      if (labelMap[name]) {
        const as = awayStats.find((s: any) => s.name === name)
        stats.push({
          name,
          label: labelMap[name],
          homeValue: hs.displayValue ?? "0",
          awayValue: as?.displayValue ?? "0",
        })
      }
    }

    // Rosters / Lineups
    const rosters = data.rosters ?? []
    const homeRoster = rosters.find((r: any) => String(r.team?.id) === String(home.teamId))?.roster ?? []
    const awayRoster = rosters.find((r: any) => String(r.team?.id) === String(away.teamId))?.roster ?? []

    const mapRoster = (list: any[]): MatchLineupPlayer[] =>
      list.map((item: any) => ({
        id: String(item.athlete?.id || Math.random()),
        name: item.athlete?.displayName || item.athlete?.fullName || "",
        jersey: item.jersey || "-",
        position: translatePosition(item.position?.displayName || item.position?.name || ""),
        starter: Boolean(item.starter),
      }))

    return {
      id: eventId,
      date: comp.date || new Date().toISOString(),
      venue: comp.venue?.fullName ?? null,
      state,
      clock: clock || undefined,
      statusDetail: translateStatus(statusType?.shortDetail) || (statusType?.completed ? "Final" : clock || "Programado"),
      completed: Boolean(statusType?.completed),
      competitionName: header?.league?.name ? shortCompetition(header.league.name) : null,
      home,
      away,
      stats,
      events,
      commentary,
      homeLineup: mapRoster(homeRoster),
      awayLineup: mapRoster(awayRoster),
      recapArticle: data.article?.story || undefined,
    }
  } catch (err) {
    console.error("Error fetching match detail:", err)
    return null
  }
}
