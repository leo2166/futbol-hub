"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import type { TeamConfig } from "@/lib/football-api"
import { useLeagueCalendar } from "@/lib/use-football"
import { MatchCard } from "@/components/match-card"
import { EmptyState, ErrorState, MatchGridSkeleton, SectionTitle } from "@/components/states"

function ymd(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`
}

export function LeagueCalendar({
  team,
  competition,
  title,
  onSelectMatch,
}: {
  team: TeamConfig
  competition?: string
  title?: string
  onSelectMatch?: (matchId: string, league?: string) => void
}) {
  // null date = let the API pick the next upcoming matchday.
  const [date, setDate] = useState<string | null>(null)
  const query = useLeagueCalendar(team.key, date, competition)
  const data = query.data

  const dates = data?.dates ?? []
  const index = data?.index ?? -1
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < dates.length - 1

  const go = (delta: number) => {
    if (index < 0) return
    const target = dates[index + delta]
    if (target) setDate(ymd(target))
  }

  const dayLabel = data?.selectedDate
    ? new Date(data.selectedDate).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "—"

  const displayTitle = title || `Calendario · ${data?.leagueName || team.leagueName}`

  return (
    <section>
      <SectionTitle
        icon={<CalendarDays className="h-4 w-4" />}
        aside={
          data?.seasonLabel ? (
            <span className="text-xs font-medium text-muted-foreground">
              {data.seasonLabel}
            </span>
          ) : null
        }
      >
        {displayTitle}
      </SectionTitle>

      {/* Matchday navigator */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2">
        <button
          onClick={() => go(-1)}
          disabled={!hasPrev}
          aria-label="Jornada anterior"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="truncate text-center text-sm font-semibold capitalize text-foreground">
          {dayLabel}
        </span>
        <button
          onClick={() => go(1)}
          disabled={!hasNext}
          aria-label="Jornada siguiente"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {query.isLoading ? (
        <MatchGridSkeleton />
      ) : query.isError ? (
        <ErrorState
          message="No se pudo cargar el calendario de la liga desde ESPN."
          onRetry={() => query.refetch()}
        />
      ) : data && data.matches.length > 0 ? (
        <div
          className={`grid gap-3 sm:grid-cols-2 ${query.isFetching ? "opacity-60" : ""}`}
        >
          {data.matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              highlightTeamId={team.espnId}
              onSelectMatch={onSelectMatch}
            />
          ))}
        </div>
      ) : (
        <EmptyState label="No hay partidos en esta fecha." />
      )}
    </section>
  )
}
