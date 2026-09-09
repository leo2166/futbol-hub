import Image from "next/image"
import type { Match, MatchSide } from "@/lib/football-api"

function SideRow({
  side,
  showScore,
  highlight,
}: {
  side: MatchSide
  showScore: boolean
  highlight: boolean
}) {
  const dim = showScore && side.winner === false
  return (
    <div className="flex items-center justify-between gap-3">
      <div className={`flex min-w-0 items-center gap-2.5 ${dim ? "opacity-55" : ""}`}>
        <div className="relative h-6 w-6 shrink-0">
          {side.logo ? (
            <Image
              src={side.logo || "/placeholder.svg"}
              alt=""
              fill
              sizes="24px"
              className="object-contain"
              crossOrigin="anonymous"
              unoptimized
            />
          ) : (
            <div className="h-full w-full rounded-full bg-muted" />
          )}
        </div>
        <span
          className={`truncate text-sm ${
            highlight ? "font-bold text-[var(--team-accent)]" : "font-medium text-foreground"
          }`}
        >
          {side.name}
        </span>
      </div>
      {showScore && (
        <span
          className={`font-mono text-base tabular-nums ${
            side.winner ? "font-bold text-foreground" : "text-muted-foreground"
          }`}
        >
          {side.score ?? "-"}
        </span>
      )}
    </div>
  )
}

export function MatchCard({
  match,
  showCompetition = false,
  highlightTeamId,
  onSelectMatch,
}: {
  match: Match
  showCompetition?: boolean
  highlightTeamId?: string
  onSelectMatch?: (matchId: string, league?: string) => void
}) {
  const showScore = match.completed || match.state === "in"
  const kickoff = new Date(match.date)
  const dateLabel = kickoff.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  })
  const timeLabel = kickoff.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div
      onClick={() => onSelectMatch?.(match.id, match.competition?.slug ?? undefined)}
      className={`rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm transition-all hover:border-[var(--team-accent)]/60 hover:bg-card/80 ${
        onSelectMatch ? "cursor-pointer hover:scale-[1.01] hover:shadow-md" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{dateLabel}</span>
          {showCompetition && match.competition && (
            <span className="truncate rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {match.competition.short}
            </span>
          )}
        </div>
        {match.state === "in" ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--team-accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--team-accent)]" />
            {match.statusDetail || "EN VIVO"}
          </span>
        ) : match.completed ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Final
          </span>
        ) : (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{timeLabel}</span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <SideRow
          side={match.home}
          showScore={showScore}
          highlight={highlightTeamId === match.home.teamId}
        />
        <SideRow
          side={match.away}
          showScore={showScore}
          highlight={highlightTeamId === match.away.teamId}
        />
      </div>

      {match.venue && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[11px] text-muted-foreground">
          {match.venue}
        </p>
      )}
    </div>
  )
}

