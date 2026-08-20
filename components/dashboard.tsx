"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Newspaper, Trophy, Users, Users2 } from "lucide-react"
import { TEAM_ORDER, TEAMS, type Match, type TeamKey } from "@/lib/football-api"
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
type CalendarView = "team" | "league"

export function Dashboard() {
  const [active, setActive] = useState<TeamKey>("barcelona")
  const [tab, setTab] = useState<MainTab>("matches")
  const [view, setView] = useState<CalendarView>("team")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  const team = TEAMS[active]

  const teamQuery = useTeamData(active)
  const standingsQuery = useStandings(active)
  const newsQuery = useTeamNews(active)
  const squadQuery = useTeamSquad(active)

  // Find the next upcoming match for countdown
  const nextMatch = useMemo(() => {
    if (!teamQuery.data?.matches) return undefined
    const now = Date.now()
    return teamQuery.data.matches.find(
      (m) => !m.completed && new Date(m.date).getTime() > now,
    )
  }, [teamQuery.data?.matches])

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        ["--team-accent" as string]: team.accent,
        ["--team-accent-foreground" as string]: team.accentForeground,
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
        <header className="mb-8">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Centro de mando
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
            Fútbol Hub · Mis Equipos
          </h1>
        </header>

        {/* Team Switcher */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TEAM_ORDER.map((key) => {
            const t = TEAMS[key]
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
                        backgroundColor: t.accent,
                        color: t.accentForeground,
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

        {/* Next Match Countdown Timer */}
        {nextMatch && (
          <CountdownTimer
            match={nextMatch}
            teamName={team.shortName}
            onSelectMatch={(id) => setSelectedMatchId(id)}
          />
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
            <div className="mb-8 inline-flex rounded-lg border border-border bg-card/60 p-1">
              <ViewTab
                active={view === "team"}
                onClick={() => setView("team")}
                icon={<Users className="h-4 w-4" />}
              >
                Calendario del equipo
              </ViewTab>
              <ViewTab
                active={view === "league"}
                onClick={() => setView("league")}
                icon={<Trophy className="h-4 w-4" />}
              >
                Calendario de {team.leagueName}
              </ViewTab>
            </div>

            {/* Calendars */}
            <div className="mb-10">
              {view === "team" ? (
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
                    onSelectMatch={(id) => setSelectedMatchId(id)}
                  />
                ) : (
                  <EmptyState label="No hay partidos disponibles para este equipo." />
                )
              ) : (
                <LeagueCalendar
                  key={active}
                  team={team}
                  onSelectMatch={(id) => setSelectedMatchId(id)}
                />
              )}
            </div>

            {/* Standings */}
            <section className="mb-6">
              <SectionTitle icon={<Trophy className="h-4 w-4" />}>
                Tabla · {team.leagueName}
              </SectionTitle>
              {standingsQuery.isLoading ? (
                <Skeleton className="h-80" />
              ) : standingsQuery.isError ? (
                <ErrorState
                  message="No se pudo cargar la clasificación desde ESPN."
                  onRetry={() => standingsQuery.refetch()}
                />
              ) : standingsQuery.data && standingsQuery.data.length > 0 ? (
                <StandingsTable
                  rows={standingsQuery.data}
                  highlightId={team.espnId}
                />
              ) : (
                <EmptyState label="La clasificación no está disponible por el momento." />
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
        {selectedMatchId && (
          <MatchDetailModal
            matchId={selectedMatchId}
            league={team.league}
            onClose={() => setSelectedMatchId(null)}
          />
        )}

        <footer className="mt-12 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          Datos oficiales en tiempo real vía ESPN API · FC Barcelona · Real Madrid · Inter Miami
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

