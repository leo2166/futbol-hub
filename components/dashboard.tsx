"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { CalendarDays, Newspaper, Radio, Sparkles, Trophy, Users, Users2 } from "lucide-react"
import { TEAM_ORDER, TEAMS, teamHasChampionsLeague, teamHasNationsLeague, type TeamKey } from "@/lib/football-api"
import { ThemeToggle, useTheme } from "@/components/theme-provider"
import {
  useLeagueCalendar,
  useStandings,
  useTeamData,
  useTeamNews,
  useTeamSquad,
} from "@/lib/use-football"
import { StandingsTable } from "@/components/standings-table"
import { TeamCalendar } from "@/components/team-calendar"
import { LeagueCalendar } from "@/components/league-calendar"
import { NewsFeed } from "@/components/news-feed"
import { SquadGrid } from "@/components/squad-grid"
import { CountdownTimer } from "@/components/countdown-timer"
import { MatchDetailModal } from "@/components/match-detail-modal"
import {
  EmptyState,
  ErrorState,
  MatchGridSkeleton,
  SectionTitle,
  Skeleton,
} from "@/components/states"

type MainTab = "matches" | "news" | "squad"
type CalendarView = "team" | "league" | "ucl" | "nations-league"
type StandingsView = "league" | "ucl"

export function Dashboard() {
  const [active, setActive] = useState<TeamKey>("barcelona")
  const [tab, setTab] = useState<MainTab>("matches")
  const [view, setView] = useState<CalendarView>("team")
  const [standingsTab, setStandingsTab] = useState<StandingsView>("league")
  const [selectedMatch, setSelectedMatch] = useState<{ id: string; league?: string } | null>(null)

  const { resolvedTheme } = useTheme()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const team = TEAMS[active]
  const getTeamColors = (key: TeamKey) => {
    const cfg = TEAMS[key]
    if (key === "real-madrid" && resolvedTheme === "beige") {
      return { accent: "#1e3a8a", accentForeground: "#ffffff" }
    }
    return { accent: cfg.accent, accentForeground: cfg.accentForeground }
  }
  const activeColors = getTeamColors(active)

  const hasUcl = teamHasChampionsLeague(active)
  const hasNationsLeague = teamHasNationsLeague(active)

  const teamQuery = useTeamData(active)
  const standingsQuery = useStandings(active)
  const uclStandingsQuery = useStandings(active, "uefa.champions")
  const newsQuery = useTeamNews(active)
  const squadQuery = useTeamSquad(active)

  // When switching teams, reset UCL-only views if the team does not play in UCL
  const currentView = (!hasUcl && view === "ucl") || (!hasNationsLeague && view === "nations-league") ? "team" : view
  const currentStandingsTab = !hasUcl && standingsTab === "ucl" ? "league" : standingsTab

  const sortedMatches = useMemo(() => {
    if (!teamQuery.data?.matches) return []
    return [...teamQuery.data.matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }, [teamQuery.data?.matches])

  // Find if there is a match in progress right now
  const liveMatch = useMemo(() => {
    return sortedMatches.find(
      (m) =>
        m.state === "in" ||
        (!m.completed && m.statusDetail?.toLowerCase().includes("vivo")),
    )
  }, [sortedMatches])

  // "Vivir el presente":
  // 1) Si no hay partido en vivo, mostrar el partido de hoy que aún no ha finalizado
  // 2) Si hoy no hay partido o el partido de hoy ya finalizó, mostrar el próximo partido futuro
  const nextMatch = useMemo(() => {
    if (liveMatch) return undefined
    const KICKOFF_GRACE_MS = 3 * 60 * 60 * 1000
    return sortedMatches.find((m) => {
      if (m.completed || m.state === "post") return false
      return new Date(m.date).getTime() >= now - KICKOFF_GRACE_MS
    })
  }, [sortedMatches, liveMatch, now])

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        ["--team-accent" as string]: activeColors.accent,
        ["--team-accent-foreground" as string]: activeColors.accentForeground,
      }}
    >
      {/* Ambient team-colored glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-72 opacity-25 blur-3xl transition-all duration-700"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, var(--team-accent), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Centro de mando
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
              Fútbol Hub · Mis Equipos
            </h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Team Switcher */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TEAM_ORDER.map((key) => {
            const t = TEAMS[key]
            const tColors = getTeamColors(key)
            const isActive = key === active
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "border-transparent shadow-lg"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: tColors.accent,
                        color: tColors.accentForeground,
                      }
                    : undefined
                }
              >
                {t.name}
              </button>
            )
          })}
        </div>

        {/* Team Meta Banner */}
        <div className="mb-6 flex items-baseline justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{team.name}</h2>
            <p className="text-sm text-muted-foreground">
              {team.leagueName}
              {teamQuery.data?.seasonLabel ? ` · Temporada ${teamQuery.data.seasonLabel}` : ""}
            </p>
          </div>
        </div>

        {/* LIVE MATCH BANNER (when match is currently in progress) */}
        {liveMatch && (
          <div
            onClick={() =>
              setSelectedMatch({
                id: liveMatch.id,
                league: liveMatch.competition?.slug || team.league,
              })
            }
            className="mb-8 relative overflow-hidden rounded-2xl border-2 border-rose-500/80 bg-rose-500/10 dark:bg-rose-950/20 p-5 backdrop-blur-md cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-rose-500/10"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="flex items-center gap-2 rounded-full bg-rose-500/15 dark:bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 dark:bg-rose-500"></span>
                </span>
                EN JUEGO · MINUTO A MINUTO
              </span>
              <span className="font-mono text-sm font-bold text-rose-700 dark:text-rose-300">
                {liveMatch.statusDetail || "EN VIVO"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                {liveMatch.home.logo && (
                  <div className="relative h-9 w-9 shrink-0">
                    <Image
                      src={liveMatch.home.logo}
                      alt=""
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
                <span className="font-bold text-foreground text-sm sm:text-base">
                  {liveMatch.home.name}
                </span>
              </div>

              <div className="font-mono text-2xl sm:text-3xl font-black text-foreground px-3">
                {liveMatch.home.score ?? 0} : {liveMatch.away.score ?? 0}
              </div>

              <div className="flex flex-1 items-center justify-end gap-3 text-right">
                <span className="font-bold text-foreground text-sm sm:text-base">
                  {liveMatch.away.name}
                </span>
                {liveMatch.away.logo && (
                  <div className="relative h-9 w-9 shrink-0">
                    <Image
                      src={liveMatch.away.logo}
                      alt=""
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-rose-500/20 pt-2.5 text-xs text-rose-700/90 dark:text-rose-300/80">
              <span>{liveMatch.competition?.name || "Partido en vivo"}</span>
              <span className="font-semibold underline flex items-center gap-1">
                <Radio className="h-3 w-3 animate-pulse text-rose-600 dark:text-rose-400" />
                Pulsar para abrir Minuto a Minuto en directo &rarr;
              </span>
            </div>
          </div>
        )}

        {/* Next Match Countdown Timer (only shown if not currently playing) */}
        {!liveMatch && nextMatch && (
          <CountdownTimer
            match={nextMatch}
            teamName={team.shortName}
            onSelectMatch={(id, league) =>
              setSelectedMatch({
                id,
                league: league || nextMatch.competition?.slug || team.league,
              })
            }
          />
        )}

        {!teamQuery.isLoading && !teamQuery.isError && !liveMatch && !nextMatch && (
          <div className="mb-8 rounded-2xl border border-border bg-card/70 p-4 text-center text-sm text-muted-foreground">
            No hay partidos próximos programados en el calendario de {team.name} por ahora.
          </div>
        )}

        {/* Main Section Navigation Tabs */}
        <div className="mb-8 flex rounded-xl border border-border bg-card/60 p-1 backdrop-blur-sm">
          <SectionNavTab
            active={tab === "matches"}
            onClick={() => setTab("matches")}
            icon={<CalendarDays className="h-4 w-4" />}
          >
            Partidos
          </SectionNavTab>
          <SectionNavTab
            active={tab === "news"}
            onClick={() => setTab("news")}
            icon={<Newspaper className="h-4 w-4" />}
          >
            Noticias
          </SectionNavTab>
          <SectionNavTab
            active={tab === "squad"}
            onClick={() => setTab("squad")}
            icon={<Users2 className="h-4 w-4" />}
          >
            Plantilla
          </SectionNavTab>
        </div>

        {/* TAB 1: PARTIDOS */}
        {tab === "matches" && (
          <div>
            {/* Calendar Sub-view Switcher */}
            <div className="mb-8 flex flex-wrap gap-2 rounded-lg border border-border bg-card/60 p-1">
              <ViewTab
                active={currentView === "team"}
                onClick={() => setView("team")}
                icon={<Users className="h-4 w-4" />}
              >
                Calendario del equipo
              </ViewTab>
              <ViewTab
                active={currentView === "league"}
                onClick={() => setView("league")}
                icon={<Trophy className="h-4 w-4" />}
              >
                Calendario de {team.leagueName}
              </ViewTab>
              {hasUcl && (
                <ViewTab
                  active={currentView === "ucl"}
                  onClick={() => setView("ucl")}
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  Calendario de Champions
                </ViewTab>
              )}
              {hasNationsLeague && (
                <ViewTab
                  active={currentView === "nations-league"}
                  onClick={() => setView("nations-league")}
                  icon={<Radio className="h-4 w-4" />}
                >
                  Calendario Nations League
                </ViewTab>
              )}
            </div>

            {/* Calendars */}
            <div className="mb-10">
              {currentView === "team" ? (
                teamQuery.isLoading ? (
                  <div className="space-y-8">
                    <MatchGridSkeleton />
                    <MatchGridSkeleton />
                  </div>
                ) : teamQuery.isError ? (
                  <ErrorState
                    message="No se pudo cargar el calendario del equipo desde ESPN."
                    onRetry={() => teamQuery.refetch()}
                  />
                ) : teamQuery.data && teamQuery.data.matches.length > 0 ? (
                  <TeamCalendar
                    data={teamQuery.data}
                    onSelectMatch={(id, league) =>
                      setSelectedMatch({ id, league: league || team.league })
                    }
                  />
                ) : (
                  <EmptyState label="No hay partidos disponibles para este equipo." />
                )
              ) : currentView === "league" ? (
                <LeagueCalendar
                  key={`${active}-league`}
                  team={team}
                  onSelectMatch={(id, league) =>
                    setSelectedMatch({ id, league: league || team.league })
                  }
                />
              ) : currentView === "nations-league" ? (
                <LeagueCalendar
                  key={`${active}-nations-league`}
                  team={team}
                  competition="uefa.nations_league"
                  title="Calendario · UEFA Nations League"
                  onSelectMatch={(id, league) =>
                    setSelectedMatch({ id, league: league || "uefa.nations_league" })
                  }
                />
              ) : (
                <LeagueCalendar
                  key={`${active}-ucl`}
                  team={team}
                  competition="uefa.champions"
                  title="Calendario · UEFA Champions League"
                  onSelectMatch={(id, league) =>
                    setSelectedMatch({ id, league: league || "uefa.champions" })
                  }
                />
              )}
            </div>

            {/* Standings */}
            <section className="mb-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle icon={<Trophy className="h-4 w-4" />}>
                  {currentStandingsTab === "league"
                    ? `Tabla · ${team.leagueName}`
                    : "Tabla · UEFA Champions League (Fase de Liga)"}
                </SectionTitle>

                {hasUcl && (
                  <div className="inline-flex rounded-lg border border-border bg-card/60 p-1">
                    <button
                      onClick={() => setStandingsTab("league")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        currentStandingsTab === "league"
                          ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {team.leagueName}
                    </button>
                    <button
                      onClick={() => setStandingsTab("ucl")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        currentStandingsTab === "ucl"
                          ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Champions League</span>
                    </button>
                  </div>
                )}
              </div>

              {currentStandingsTab === "league" ? (
                standingsQuery.isLoading ? (
                  <Skeleton className="h-80" />
                ) : standingsQuery.isError ? (
                  <ErrorState
                    message={`No se pudo cargar la clasificación de ${team.leagueName} desde ESPN.`}
                    onRetry={() => standingsQuery.refetch()}
                  />
                ) : standingsQuery.data && standingsQuery.data.length > 0 ? (
                  <StandingsTable
                    rows={standingsQuery.data}
                    highlightId={team.espnId}
                  />
                ) : (
                  <EmptyState label="La clasificación no está disponible por el momento." />
                )
              ) : uclStandingsQuery.isLoading ? (
                <Skeleton className="h-80" />
              ) : uclStandingsQuery.isError ? (
                <ErrorState
                  message="No se pudo cargar la clasificación de la Champions League desde ESPN."
                  onRetry={() => uclStandingsQuery.refetch()}
                />
              ) : uclStandingsQuery.data && uclStandingsQuery.data.length > 0 ? (
                <StandingsTable
                  rows={uclStandingsQuery.data}
                  highlightId={team.espnId}
                />
              ) : (
                <EmptyState label="La clasificación de Champions League no está disponible por el momento." />
              )}
            </section>
          </div>
        )}

        {/* TAB 2: NOTICIAS */}
        {tab === "news" && (
          <div className="mb-10">
            <NewsFeed
              articles={newsQuery.data}
              isLoading={newsQuery.isLoading}
              isError={newsQuery.isError}
              onRetry={() => newsQuery.refetch()}
            />
          </div>
        )}

        {/* TAB 3: PLANTILLA */}
        {tab === "squad" && (
          <div className="mb-10">
            <SquadGrid
              players={squadQuery.data}
              isLoading={squadQuery.isLoading}
              isError={squadQuery.isError}
              onRetry={() => squadQuery.refetch()}
            />
          </div>
        )}

        {/* Match Detail Modal (when a match card is clicked) */}
        {selectedMatch && (
          <MatchDetailModal
            matchId={selectedMatch.id}
            league={selectedMatch.league || team.league}
            onClose={() => setSelectedMatch(null)}
          />
        )}

        <footer className="mt-12 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          Datos oficiales en tiempo real vía ESPN API · FC Barcelona · Inter Miami CF
        </footer>
      </div>
    </div>
  )
}

function SectionNavTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all sm:text-sm ${
        active
          ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow-md"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
        active
          ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

