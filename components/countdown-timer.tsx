"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Bell, BellOff, BellRing, Check, Sparkles } from "lucide-react"
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
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Registrar Service Worker al montar
  useEffect(() => {
    registerServiceWorker()
  }, [])

  useEffect(() => {
    if (!match?.date) return
    setTimeLeft(calculateTimeLeft(match.date))
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(match.date))
    }, 1000)
    return () => clearInterval(timer)
  }, [match?.date])

  // Limpiar timers al desmontar
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }, [])

  if (!match || !timeLeft || timeLeft.isLiveOrPast) return null

  const matchId     = match.id
  const matchTitle  = `${match.home.name} vs ${match.away.name}`
  const kickoff     = new Date(match.date).getTime()
  const competition = match.competition?.name

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

  const isSaved     = reminderState === "saved"
  const isSaving    = reminderState === "saving"
  const isCancelled = reminderState === "cancelled"
  const isDenied    = reminderState === "denied"

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
        {/* Info del partido */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--team-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Próximo Gran Encuentro</span>
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
          {/* Dígitos del contador */}
          <div className="flex items-center gap-1.5 text-center">
            {[
              { value: timeLeft.days,    label: "días" },
              { value: timeLeft.hours,   label: "hrs"  },
              { value: timeLeft.minutes, label: "min"  },
              { value: timeLeft.seconds, label: "seg", accent: true },
            ].map((unit, i) => (
              <div key={unit.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="font-bold text-muted-foreground">:</span>}
                <div className="rounded-xl border border-border/80 bg-background/60 px-2.5 py-1.5 min-w-[42px]">
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

          {/* ── BOTÓN DE ALARMA PROMINENTE ── */}
          <button
            onClick={handleToggleReminder}
            disabled={isSaving}
            aria-label={isSaved ? "Cancelar alarma" : "Activar alarma 5 min antes"}
            className={`
              relative w-full flex items-center justify-center gap-2
              rounded-xl border px-4 py-2.5 text-sm font-bold
              transition-all duration-300 select-none overflow-hidden
              ${isSaved
                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/20"
                : isDenied
                ? "border-rose-500/60 bg-rose-500/10 text-rose-400"
                : isCancelled
                ? "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                : isSaving
                ? "border-[var(--team-accent)]/40 bg-[var(--team-accent)]/10 text-[var(--team-accent)] opacity-70"
                : "border-border bg-card/80 text-muted-foreground hover:border-[var(--team-accent)] hover:text-[var(--team-accent)] hover:bg-[var(--team-accent)]/10 active:scale-95"
              }
            `}
          >
            {/* Anillo de pulso verde cuando activo */}
            {isSaved && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-emerald-500/20 pointer-events-none" />
            )}

            {/* Icono que cambia según estado */}
            {isSaved     ? <BellRing className="h-4 w-4 shrink-0 animate-bounce" /> :
             isCancelled ? <BellOff  className="h-4 w-4 shrink-0" /> :
             isSaving    ? <Bell     className="h-4 w-4 shrink-0 animate-pulse" /> :
                           <Bell     className="h-4 w-4 shrink-0" />}

            {/* Texto claro según estado */}
            <span>
              {isSaved     && "🔔 Alarma activa — toca para cancelar"}
              {isSaving    && "Guardando alarma…"}
              {isCancelled && "🔕 Alarma cancelada"}
              {isDenied    && "⚠️ Activa notificaciones en el navegador"}
              {!isSaved && !isSaving && !isCancelled && !isDenied && "Activar alarma 5 min antes"}
            </span>

            {/* ✓ al final cuando activo */}
            {isSaved && <Check className="h-4 w-4 shrink-0 ml-auto" />}
          </button>
        </div>
      </div>
    </div>
  )
}
