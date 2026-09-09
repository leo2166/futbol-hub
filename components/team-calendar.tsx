"use client"

import { useMemo, useState } from "react"
import { CalendarClock, History } from "lucide-react"
import type { Match, TeamData } from "@/lib/football-api"
import { MatchCard } from "@/components/match-card"
import { EmptyState, SectionTitle } from "@/components/states"

const KICKOFF_GRACE_MS = 3 * 60 * 60 * 1000 // treat a match as "current" for 3h

export function TeamCalendar({
  data,
  onSelectMatch,
}: {
  data: TeamData
  onSelectMatch?: (matchId: string, league?: string) => void
}) {
  const [filter, setFilter] = useState<string>("all")

  const filtered = useMemo(
    () =>
      filter === "all"
        ? data.matches
        : data.matches.filter((m) => m.competition?.name === filter),
    [data.matches, filter],
  )

  const now = Date.now()
  const upcoming: Match[] = filtered.filter(
    (m) => !m.completed && new Date(m.date).getTime() >= now - KICKOFF_GRACE_MS,
  )
  const played: Match[] = filtered
    .filter((m) => m.completed || new Date(m.date).getTime() < now - KICKOFF_GRACE_MS)
    .reverse()

  return (
    <div>
      {/* Competition filter chips */}
      {data.competitions.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            Todas
            <span className="ml-1.5 text-[10px] opacity-70">{data.matches.length}</span>
          </Chip>
          {data.competitions.map((c) => (
            <Chip
              key={c.name}
              active={filter === c.name}
              onClick={() => setFilter(c.name)}
            >
              {c.short}
              <span className="ml-1.5 text-[10px] opacity-70">{c.count}</span>
            </Chip>
          ))}
        </div>
      )}

      <section className="mb-10">
        <SectionTitle icon={<CalendarClock className="h-4 w-4" />}>
          Próximos partidos
        </SectionTitle>
        {upcoming.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                showCompetition
                onSelectMatch={onSelectMatch}
              />
            ))}
          </div>
        ) : (
          <EmptyState label="No hay partidos programados para esta competición todavía." />
        )}
      </section>

      <section>
        <SectionTitle icon={<History className="h-4 w-4" />}>
          Partidos jugados
        </SectionTitle>
        {played.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {played.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                showCompetition
                onSelectMatch={onSelectMatch}
              />
            ))}
          </div>
        ) : (
          <EmptyState label="Aún no hay resultados disponibles." />
        )}
      </section>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-[var(--team-accent)] bg-[var(--team-accent)]/15 text-foreground"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
