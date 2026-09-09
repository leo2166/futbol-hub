"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Bell, BellOff, Check, Clock, Sparkles } from "lucide-react"
import type { Match } from "@/lib/football-api"
import { scheduleMatchReminder, cancelMatchReminder, registerServiceWorker } from "@/lib/notifications"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  isLiveOrPast: boolean
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLiveOrPast: true }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isLiveOrPast: false,
  }
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
  const [swReady, setSwReady] = useState(false)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Register the Service Worker early so it's ready when user hits the bell
  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) setSwReady(true)
    })
  }, [])

  useEffect(() => {
    if (!match?.date) return
    setTimeLeft(calculateTimeLeft(match.date))

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(match.date))
    }, 1000)

    return () => clearInterval(timer)
  }, [match?.date])

  // Clear feedback timer on unmount
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }, [])

  if (!match || !timeLeft || timeLeft.isLiveOrPast) return null

  const matchId    = match.id
  const matchTitle = `${match.home.name} vs ${match.away.name}`
  const kickoff    = new Date(match.date).getTime()
  const competition = match.competition?.name

  const handleToggleReminder = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Cancel if already saved
    if (reminderState === "saved") {
      await cancelMatchReminder(matchId)
      setReminderState("cancelled")
      feedbackTimer.current = setTimeout(() => setReminderState("idle"), 2500)
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
      // Keep "saved" state persistent — user can cancel with another click
    } else if (result.error === "Permiso denegado") {
      setReminderState("denied")
      feedbackTimer.current = setTimeout(() => setReminderState("idle"), 4000)
    } else {
      // Fallback (tab must be open)
      setReminderState("saved")
    }
  }

  // Determine bell button appearance
  const bellLabel =
    reminderState === "saved"     ? "Cancelar recordatorio" :
    reminderState === "saving"    ? "Guardando…" :
    reminderState === "cancelled" ? "Recordatorio cancelado" :
    reminderState === "denied"    ? "Activa las notificaciones" :
    "Recordatorio 5 min antes"

  const bellClass =
    reminderState === "saved"
      ? "border-[var(--team-accent)]/60 bg-[var(--team-accent)]/15 text-[var(--team-accent)]"
      : reminderState === "denied"
      ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
      : reminderState === "cancelled"
      ? "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
      : "border-border bg-card/60 text-muted-foreground hover:text-[var(--team-accent)] hover:border-[var(--team-accent)]"

  return (
    <div
      onClick={() => onSelectMatch?.(match.id, match.competition?.slug ?? undefined)}
      className="mb-8 relative overflow-hidden rounded-2xl border border-[var(--team-accent)]/30 bg-card/70 p-5 backdrop-blur-md transition-all hover:border-[var(--team-accent)]/60 cursor-pointer shadow-lg shadow-[var(--team-accent)]/5"
    >
      {/* Background Accent Gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: "var(--team-accent)" }}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Match Header */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--team-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Próximo Gran Encuentro</span>
          </div>

          <div className="flex items-center gap-2.5 my-1">
            <div className="relative h-6 w-6">
              {match.home.logo && (
                <Image
                  src={match.home.logo}
                  alt={match.home.name}
                  fill
                  sizes="24px"
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
            <span className="text-sm font-bold text-foreground">
              {match.home.name} <span className="text-muted-foreground font-normal">vs</span> {match.away.name}
            </span>
            <div className="relative h-6 w-6">
              {match.away.logo && (
                <Image
                  src={match.away.logo}
                  alt={match.away.name}
                  fill
                  sizes="24px"
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
          </div>

          <span className="text-xs text-muted-foreground">
            {match.competition?.name} · {new Date(match.date).toLocaleDateString("es-ES", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Countdown Ticker + Bell */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 text-center">
            <div className="rounded-xl border border-border/80 bg-background/60 px-2.5 py-1.5 min-w-[42px]">
              <span className="font-mono text-base font-bold text-foreground tabular-nums">
                {String(timeLeft.days).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                días
              </span>
            </div>
            <span className="font-bold text-muted-foreground">:</span>
            <div className="rounded-xl border border-border/80 bg-background/60 px-2.5 py-1.5 min-w-[42px]">
              <span className="font-mono text-base font-bold text-foreground tabular-nums">
                {String(timeLeft.hours).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                hrs
              </span>
            </div>
            <span className="font-bold text-muted-foreground">:</span>
            <div className="rounded-xl border border-border/80 bg-background/60 px-2.5 py-1.5 min-w-[42px]">
              <span className="font-mono text-base font-bold text-foreground tabular-nums">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                min
              </span>
            </div>
            <span className="font-bold text-muted-foreground">:</span>
            <div className="rounded-xl border border-border/80 bg-background/60 px-2.5 py-1.5 min-w-[42px]">
              <span className="font-mono text-base font-bold text-[var(--team-accent)] tabular-nums">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                seg
              </span>
            </div>

            {/* Bell button */}
            <button
              onClick={handleToggleReminder}
              disabled={reminderState === "saving"}
              className={`rounded-xl border p-2.5 transition-all ml-1 ${bellClass}`}
              title={bellLabel}
              aria-label={bellLabel}
            >
              {reminderState === "saved" ? (
                <Check className="h-4 w-4" />
              ) : reminderState === "cancelled" ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className={`h-4 w-4 ${reminderState === "saving" ? "animate-pulse" : ""}`} />
              )}
            </button>
          </div>

          {/* Status message below the ticker */}
          {reminderState !== "idle" && reminderState !== "saving" && (
            <p className={`text-[10px] font-semibold text-center transition-opacity ${
              reminderState === "saved"     ? "text-[var(--team-accent)]" :
              reminderState === "denied"    ? "text-rose-400" :
              "text-muted-foreground"
            }`}>
              {reminderState === "saved"     && "🔔 Alarma activa · 5 min antes del partido"}
              {reminderState === "cancelled" && "🔕 Recordatorio cancelado"}
              {reminderState === "denied"    && "⚠️ Permite notificaciones en el navegador"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
