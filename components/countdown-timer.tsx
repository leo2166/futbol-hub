"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Bell, Clock, Sparkles } from "lucide-react"
import type { Match } from "@/lib/football-api"
import { sendMatchReminder } from "@/lib/notifications"

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
  const [reminded, setReminded] = useState(false)

  useEffect(() => {
    if (!match?.date) return
    setTimeLeft(calculateTimeLeft(match.date))

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(match.date))
    }, 1000)

    return () => clearInterval(timer)
  }, [match?.date])

  if (!match || !timeLeft || timeLeft.isLiveOrPast) return null

  const handleNotify = (e: React.MouseEvent) => {
    e.stopPropagation()
    const title = `${match.home.name} vs ${match.away.name}`
    sendMatchReminder(title, match.date, teamName)
    setReminded(true)
    setTimeout(() => setReminded(false), 3000)
  }

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

        {/* Countdown Ticker */}
        <div className="flex items-center gap-2">
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
          </div>

          {/* Reminder Bell Button */}
          <button
            onClick={handleNotify}
            className={`rounded-xl border p-2.5 transition-all ${
              reminded
                ? "border-green-500/50 bg-green-500/20 text-green-400"
                : "border-border bg-card/60 text-muted-foreground hover:text-[var(--team-accent)] hover:border-[var(--team-accent)]"
            }`}
            title="Activar Recordatorio"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
