"use client"

// ─── Fútbol Hub · Notification System ────────────────────────────────────────
// Usa el Service Worker (public/sw.js) + Web Notifications API + Web Audio API:
//   • Notificaciones audibles + visibles en Android/Desktop (vía SW showNotification)
//   • Funciona en segundo plano / cuando la app está cerrada
//   • Fallback graceful con setTimeout + sonido Web Audio cuando la pestaña está abierta
//   • Persistencia en localStorage para mostrar el estado de la alarma al instante
// ─────────────────────────────────────────────────────────────────────────────

const REMINDERS_STORAGE_KEY = "futbol-hub-reminders"
const FIRED_STORAGE_KEY = "futbol-hub-reminders-fired"

interface StoredReminder {
  id: string
  matchTitle: string
  teamName: string
  kickoff: number
  competition?: string
}

// ── Persistencia rápida en localStorage ───────────────────────────────────────
function readStoredReminders(): Record<string, StoredReminder> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StoredReminder>
    const now = Date.now()
    const cleaned: Record<string, StoredReminder> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.kickoff > now - 3 * 60 * 60 * 1000) {
        cleaned[k] = v
      }
    }
    return cleaned
  } catch {
    return {}
  }
}

function writeStoredReminders(map: Record<string, StoredReminder>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

export function hasMatchReminder(id: string): boolean {
  const map = readStoredReminders()
  return Boolean(map[id])
}

export function markReminderFired(id: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(FIRED_STORAGE_KEY)
    const set: string[] = raw ? JSON.parse(raw) : []
    if (set.includes(id)) return false
    set.push(id)
    localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(set.slice(-30)))
    return true
  } catch {
    return true
  }
}

// ── Sonido de alarma suave con Web Audio API ──────────────────────────────────
export function playAlarmChime() {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const notes = [880, 1108.73, 1318.51] // A5, C#6, E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, now + i * 0.16)
      gain.gain.setValueAtTime(0.001, now + i * 0.16)
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.16 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.16)
      osc.stop(now + i * 0.16 + 0.3)
    })
  } catch {
    // ignore audio autoplay restrictions
  }
}

// ── Service Worker registration ───────────────────────────────────────────────
let swRegistration: ServiceWorkerRegistration | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  if (swRegistration) return swRegistration

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    return swRegistration
  } catch (err) {
    console.warn("[SW] Registration failed:", err)
    return null
  }
}

async function getActiveSW(): Promise<ServiceWorker | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return reg.active
  } catch {
    return null
  }
}

// ── Permission request ────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false

  const result = await Notification.requestPermission()
  return result === "granted"
}

function startSwPingLoop() {
  if (pingInterval) return
  pingInterval = setInterval(async () => {
    const active = await getActiveSW()
    active?.postMessage({ type: "PING" })
  }, 25_000)
}

function stopSwPingLoop() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

// ── Schedule a reminder via the Service Worker ────────────────────────────────
export async function scheduleMatchReminder(params: {
  id: string
  matchTitle: string
  teamName: string
  kickoff: number // Unix ms
  competition?: string
}): Promise<{ ok: boolean; method: "sw" | "timeout" | "none"; error?: string }> {
  const granted = await requestNotificationPermission()
  if (!granted) {
    return { ok: false, method: "none", error: "Permiso denegado" }
  }

  const map = readStoredReminders()
  map[params.id] = params
  writeStoredReminders(map)

  await registerServiceWorker()
  const active = await getActiveSW()

  if (active) {
    active.postMessage({
      type: "SCHEDULE_REMINDER",
      ...params,
    })
    startSwPingLoop()
    return { ok: true, method: "sw" }
  }

  const now = Date.now()
  const msUntilAlert = params.kickoff - now - 5 * 60 * 1000
  if (msUntilAlert <= 0 && params.kickoff - now > -90_000) {
    if (markReminderFired(params.id)) {
      playAlarmChime()
      fireLocalNotification(params.matchTitle, params.teamName, params.competition)
    }
    return { ok: true, method: "timeout" }
  }

  if (msUntilAlert > 0 && msUntilAlert < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      if (hasMatchReminder(params.id) && markReminderFired(params.id)) {
        playAlarmChime()
        fireLocalNotification(params.matchTitle, params.teamName, params.competition)
      }
    }, msUntilAlert)
    return { ok: true, method: "timeout" }
  }

  return { ok: true, method: "timeout" }
}

// ── Cancel a reminder ─────────────────────────────────────────────────────────
export async function cancelMatchReminder(id: string): Promise<void> {
  const map = readStoredReminders()
  delete map[id]
  writeStoredReminders(map)

  const active = await getActiveSW()
  active?.postMessage({ type: "CANCEL_REMINDER", id })
  if (Object.keys(map).length === 0) {
    stopSwPingLoop()
  }
}

// ── Fire an immediate local notification (fallback, sin SW) ───────────────────
export function fireLocalNotification(
  matchTitle: string,
  teamName: string,
  competition?: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return

  try {
    const n = new Notification(`⚽ ¡Empieza en 5 min! — ${teamName}`, {
      body: `${matchTitle}${competition ? `\n${competition}` : ""}`,
      icon: "/apple-icon.png",
      badge: "/icon-dark-32x32.png",
      silent: false,
    })
    n.onclick = () => window.focus()
  } catch {
    // Android Chrome lanza error aquí — el SW debería haberlo manejado
  }
}
