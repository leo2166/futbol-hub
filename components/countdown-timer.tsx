"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Bell, BellOff, BellRing, Check, Clock, Sparkles } from "lucide-react"
import type { Match } from "@/lib/football-api"
import {
  cancelMatchReminder,
  fireLocalNotification,
  hasMatchReminder,
  markReminderFired,
  playAlarmChime,
  registerServiceWorker,
  scheduleMatchReminder,
} from "@/lib/notifications"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  diffMs: number
  isLiveOrPast: boolean
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const diffMs = new Date(targetDate).getTime() - Date.now()
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, diffMs, isLiveOrPast: true }
  }
  return {
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diffMs / 1000 / 60) % 60),
    seconds: Math.floor((diffMs / 1000) % 60),
    diffMs,
    isLiveOrPast: false,
  }
}

function isSameLocalDay(isoDate: string): boolean {
  const target = new Date(isoDate)
  const now = new Date()
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  )
}

type ReminderState = "idle" | "saving" | "saved" | "cancelled" | "denied"

export function CountdownTimer({
  match,
  teamName,
  onSelectMatch,
}: {
  match?: Match
  teamName: string
  onSelectMatch?: (matchId: string, league?: string) => void
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [reminderState, setReminderState] = useState<ReminderState>("idle")
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    registerServiceWorker()
  }, [])

  // Sincronizar estado de alarma guardado cuando cambia el partido
  useEffect(() => {
    if (!match?.id) return
    setReminderState(hasMatchReminder(match.id) ? "saved" : "idle")
  }, [match?.id])

  // Actualizar cuenta regresiva cada segundo y vigilar ventana de 5 min en primer plano
  useEffect(() => {
    if (!match?.date) return
    const update = () => {
      const next = calculateTimeLeft(match.date)
      setTimeLeft(next)

      if (
        hasMatchReminder(match.id) &&
        next.diffMs <= 5 * 60 * 1000 &&
        next.diffMs > -90_000 &&
        markReminderFired(match.id)
      ) {
        playAlarmChime()
        fireLocalNotification(
          `${match.home.name} vs ${match.away.name}`,
          teamName,
          match.competition?.name,
        )
      }
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [match?.id, match?.date, match?.home.name, match?.away.name, match?.competition?.name, teamName])

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
  }, [])

  if (!match || !timeLeft) return null

  const matchId = match.id
  const matchTitle = `${match.home.name} vs ${match.away.name}`
  const kickoff = new Date(match.date).getTime()
  const competition = match.competition?.name
  const isToday = isSameLocalDay(match.date)

  const handleToggleReminder = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (reminderState === "saved") {
      await cancelMatchReminder(matchId)
      setReminderState("cancelled")
      feedbackTimer.current = setTimeout(() => setReminderState("idle"), 3000)
      return
    }

    setReminderState("saving")

    const result = await scheduleMatchReminder({
      id: matchId,
      matchTitle,
      teamName,
      kickoff,
      competition,
    })

    if (result.ok) {
      setReminderState("saved")
    } else if (result.error === "Permiso denegado") {
      setReminderState("denied")
      feedbackTimer.current = setTimeout(() => setReminderState("idle"), 5000)
    } else {
      setReminderState("saved")
    }
  }

  const isSaved = reminderState === "saved"
  const isSaving = reminderState === "saving"
  const isCancelled = reminderState === "cancelled"
  const isDenied = reminderState === "denied"

  return (
    <div
      onClick={() => onSelectMatch?.(match.id, match.competition?.slug ?? undefined)}
      className="mb-8 relative overflow-hidden rounded-2xl border border-[var(--team-accent)]/35 bg-card/85 p-5 backdrop-blur-md transition-all hover:border-[var(--team-accent)]/70 cursor-pointer shadow-lg shadow-[var(--team-accent)]/5"
    >
      {/* Background Accent Gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: "var(--team-accent)" }}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Info del partido */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--team-accent)]">
              {isToday ? <Clock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{isToday ? "Juego de hoy" : "Próximo partido"}</span>
            </span>
            {isToday && (
              <span className="rounded-full bg-[var(--team-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--team-accent-foreground)]">
                Hoy
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 my-1">
            <div className="relative h-6 w-6">
              {match.home.logo && (
                <Image src={match.home.logo} alt={match.home.name} fill sizes="24px" className="object-contain" unoptimized />
              )}
            </div>
            <span className="text-sm font-bold text-foreground">
              {match.home.name} <span className="text-muted-foreground font-normal">vs</span> {match.away.name}
            </span>
            <div className="relative h-6 w-6">
              {match.away.logo && (
                <Image src={match.away.logo} alt={match.away.name} fill sizes="24px" className="object-contain" unoptimized />
              )}
            </div>
          </div>

          <span className="text-xs text-muted-foreground">
            {match.competition?.name} · {new Date(match.date).toLocaleDateString("es-ES", {
              weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>

        {/* Contador + Botón de Alarma */}
        <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
          {timeLeft.isLiveOrPast ? (
            <div className="rounded-xl border border-[var(--team-accent)]/40 bg-background/70 px-4 py-2 text-center">
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--team-accent)]">
                ¡Por comenzar!
              </span>
              <span className="text-[11px] text-muted-foreground">
                Esperando actualización en vivo…
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {isToday && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tiempo para el inicio
                </span>
              )}
              <div className="flex items-center gap-1.5 text-center">
                {[
                  { value: timeLeft.days, label: "días", hideIfZero: isToday },
                  { value: timeLeft.hours, label: "hrs" },
                  { value: timeLeft.minutes, label: "min" },
                  { value: timeLeft.seconds, label: "seg", accent: true },
                ]
                  .filter((u) => !u.hideIfZero || u.value > 0)
                  .map((unit, i) => (
                    <div key={unit.label} className="flex items-center gap-1.5">
                      {i > 0 && <span className="font-bold text-muted-foreground">:</span>}
                      <div className="rounded-xl border border-border/80 bg-background/70 px-2.5 py-1.5 min-w-[42px]">
                        <span className={`font-mono text-base font-bold tabular-nums ${unit.accent ? "text-[var(--team-accent)]" : "text-foreground"}`}>
                          {String(unit.value).padStart(2, "0")}
                        </span>
                        <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                          {unit.label}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── BOTÓN DE ALARMA PROMINENTE ── */}
          {!timeLeft.isLiveOrPast && (
            <button
              onClick={handleToggleReminder}
              disabled={isSaving}
              aria-label={isSaved ? "Cancelar alarma" : "Activar alarma 5 min antes"}
              className={`
                relative w-full flex items-center justify-center gap-2
                rounded-xl border px-4 py-2.5 text-sm font-bold
                transition-all duration-300 select-none overflow-hidden
                ${isSaved
                  ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-500/15"
                  : isDenied
                  ? "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : isCancelled
                  ? "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                  : isSaving
                  ? "border-[var(--team-accent)]/40 bg-[var(--team-accent)]/10 text-[var(--team-accent)] opacity-70"
                  : "border-border bg-background/70 text-foreground/80 hover:border-[var(--team-accent)] hover:text-[var(--team-accent)] hover:bg-[var(--team-accent)]/10 active:scale-95"
                }
              `}
            >
              {isSaved && (
                <span className="absolute inset-0 rounded-xl animate-ping bg-emerald-500/15 pointer-events-none" />
              )}

              {isSaved ? <BellRing className="h-4 w-4 shrink-0 animate-bounce" /> :
               isCancelled ? <BellOff className="h-4 w-4 shrink-0" /> :
               isSaving ? <Bell className="h-4 w-4 shrink-0 animate-pulse" /> :
                          <Bell className="h-4 w-4 shrink-0" />}

              <span>
                {isSaved && "Alarma activa (5 min antes)"}
                {isSaving && "Guardando alarma…"}
                {isCancelled && "Alarma cancelada"}
                {isDenied && "Activa notificaciones en el navegador"}
                {!isSaved && !isSaving && !isCancelled && !isDenied && "Activar alarma 5 min antes"}
              </span>

              {isSaved && <Check className="h-4 w-4 shrink-0 ml-auto" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
