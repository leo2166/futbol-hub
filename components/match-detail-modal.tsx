"use client"

import { useState } from "react"
import Image from "next/image"
import {
  X,
  Activity,
  Users2,
  ListOrdered,
  FileText,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { useMatchDetail } from "@/lib/use-football"
import { ErrorState, Skeleton } from "@/components/states"

export function MatchDetailModal({
  matchId,
  league = "esp.1",
  onClose,
}: {
  matchId: string
  league?: string
  onClose: () => void
}) {
  const [tab, setTab] = useState<"stats" | "lineup" | "timeline" | "recap">("stats")
  const { data: detail, isLoading, isError, refetch } = useMatchDetail(matchId, league)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden z-10">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-card/90 backdrop-blur-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {detail?.competitionName || "Detalle del Partido"}
          </span>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError || !detail ? (
            <ErrorState
              message="No se pudo cargar la información detallada del partido."
              onRetry={() => refetch()}
            />
          ) : (
            <>
              {/* Scoreboard Overview Card */}
              <div className="rounded-xl border border-border bg-muted/30 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                  {/* Home Team */}
                  <div className="flex flex-1 flex-col items-center text-center gap-2">
                    <div className="relative h-14 w-14">
                      {detail.home.logo ? (
                        <Image
                          src={detail.home.logo}
                          alt={detail.home.name}
                          fill
                          sizes="56px"
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="h-full w-full rounded-full bg-muted" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {detail.home.name}
                    </span>
                  </div>

                  {/* Score & Status */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-2">
                    {detail.completed || detail.home.score !== null ? (
                      <div className="flex items-center gap-3 font-mono text-3xl font-black tabular-nums text-foreground">
                        <span>{detail.home.score ?? "-"}</span>
                        <span className="text-muted-foreground/60">:</span>
                        <span>{detail.away.score ?? "-"}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">VS</span>
                    )}

                    <div className="mt-1.5 flex items-center gap-1.5">
                      {detail.statusDetail?.toLowerCase().includes("in") ||
                      detail.statusDetail?.includes("'") ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--team-accent)] animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--team-accent)]" />
                          {detail.statusDetail}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {detail.statusDetail || (detail.completed ? "Finalizado" : "Programado")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-1 flex-col items-center text-center gap-2">
                    <div className="relative h-14 w-14">
                      {detail.away.logo ? (
                        <Image
                          src={detail.away.logo}
                          alt={detail.away.name}
                          fill
                          sizes="56px"
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="h-full w-full rounded-full bg-muted" />
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {detail.away.name}
                    </span>
                  </div>
                </div>

                {/* Match Metadata */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(detail.date).toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {detail.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{detail.venue}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex rounded-xl border border-border bg-muted/40 p-1">
                <button
                  onClick={() => setTab("stats")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                    tab === "stats"
                      ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Estadísticas
                </button>
                <button
                  onClick={() => setTab("timeline")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                    tab === "timeline"
                      ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                  Goles & Eventos
                </button>
                <button
                  onClick={() => setTab("lineup")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                    tab === "lineup"
                      ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users2 className="h-3.5 w-3.5" />
                  Alineaciones
                </button>
                {detail.recapArticle && (
                  <button
                    onClick={() => setTab("recap")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                      tab === "recap"
                        ? "bg-[var(--team-accent)] text-[var(--team-accent-foreground)] shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Crónica
                  </button>
                )}
              </div>

              {/* Tab 1: Estadísticas */}
              {tab === "stats" && (
                <div className="space-y-3.5">
                  {detail.stats.length > 0 ? (
                    detail.stats.map((stat, i) => {
                      const hVal = parseFloat(stat.homeValue) || 0
                      const aVal = parseFloat(stat.awayValue) || 0
                      const total = hVal + aVal || 1
                      const hPct = Math.round((hVal / total) * 100)

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-border/70 bg-card/40 p-3"
                        >
                          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
                            <span className="font-mono font-bold text-foreground">
                              {stat.homeValue}
                            </span>
                            <span className="font-semibold text-foreground/80">
                              {stat.label}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {stat.awayValue}
                            </span>
                          </div>
                          {/* Progress bar comparison */}
                          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="bg-[var(--team-accent)] transition-all duration-500"
                              style={{ width: `${hPct}%` }}
                            />
                            <div
                              className="bg-muted-foreground/40 transition-all duration-500"
                              style={{ width: `${100 - hPct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      Las estadísticas detalladas estarán disponibles durante y después del partido.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Cronología / Goles */}
              {tab === "timeline" && (
                <div className="space-y-2.5">
                  {detail.events.length > 0 ? (
                    detail.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 text-sm"
                      >
                        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                          {evt.clock || "-"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-xs leading-relaxed">
                            {evt.text}
                          </p>
                          {evt.athleteName && (
                            <span className="text-[11px] font-bold text-[var(--team-accent)]">
                              {evt.athleteName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      No hay incidencias o goles registrados todavía.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Alineaciones */}
              {tab === "lineup" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Home Lineup */}
                  <div className="rounded-xl border border-border p-4 bg-card/40">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--team-accent)]" />
                      {detail.home.name}
                    </h4>
                    <div className="space-y-2">
                      {detail.homeLineup.filter((p) => p.starter).length > 0 ? (
                        detail.homeLineup
                          .filter((p) => p.starter)
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[var(--team-accent)] w-5 text-center">
                                  {p.jersey}
                                </span>
                                <span className="font-medium text-foreground">
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {p.position}
                              </span>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Alineación no confirmada</p>
                      )}
                    </div>
                  </div>

                  {/* Away Lineup */}
                  <div className="rounded-xl border border-border p-4 bg-card/40">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      {detail.away.name}
                    </h4>
                    <div className="space-y-2">
                      {detail.awayLineup.filter((p) => p.starter).length > 0 ? (
                        detail.awayLineup
                          .filter((p) => p.starter)
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-muted-foreground w-5 text-center">
                                  {p.jersey}
                                </span>
                                <span className="font-medium text-foreground">
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {p.position}
                              </span>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-muted-foreground">Alineación no confirmada</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Crónica */}
              {tab === "recap" && detail.recapArticle && (
                <div className="rounded-xl border border-border bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                  {detail.recapArticle}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
