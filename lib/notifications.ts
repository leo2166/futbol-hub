"use client"

// ─── Fútbol Hub · Notification System ────────────────────────────────────────
// Uses the Service Worker (public/sw.js) + Web Notifications API to deliver:
//   • Audible + visible notifications on Android (via SW showNotification)
//   • Works in background / when app is closed (SW stays alive)
//   • Falls back gracefully on desktop/iOS where SW push is limited
//
// FLOW:
//   1. requestNotificationPermission() → asks user for Notification + SW
//   2. scheduleMatchReminder()         → sends message to SW with kickoff time
//   3. SW wakes up every 30 s, fires showNotification 5 min before kick-off
//   4. Device makes sound + vibrates (Android honours device volume setting)
// ─────────────────────────────────────────────────────────────────────────────

// ── Service Worker registration ───────────────────────────────────────────────
let swRegistration: ServiceWorkerRegistration | null = null

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  if (swRegistration) return swRegistration

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    console.log("[SW] Registered:", swRegistration.scope)
    return swRegistration
  } catch (err) {
    console.warn("[SW] Registration failed:", err)
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

// ── Schedule a reminder via the Service Worker ────────────────────────────────
// The SW will fire a system notification (with sound + vibration) 5 min before kickoff.
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

  // Try Service Worker path (works on Android background)
  const sw = await registerServiceWorker()
  const active = sw?.active ?? (await navigator.serviceWorker.ready).active

  if (active) {
    active.postMessage({
      type: "SCHEDULE_REMINDER",
      ...params,
    })
    return { ok: true, method: "sw" }
  }

  // Fallback: schedule via setTimeout (only works while tab is open)
  const msUntilAlert = params.kickoff - Date.now() - 5 * 60 * 1000
  if (msUntilAlert > 0 && msUntilAlert < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      fireLocalNotification(params.matchTitle, params.teamName, params.competition)
    }, msUntilAlert)
    return { ok: true, method: "timeout" }
  }

  return { ok: false, method: "none", error: "Partido demasiado lejano o pasado" }
}

// ── Cancel a reminder ─────────────────────────────────────────────────────────
export async function cancelMatchReminder(id: string): Promise<void> {
  const sw = await registerServiceWorker()
  const active = sw?.active ?? (await navigator.serviceWorker.ready.then((r) => r.active).catch(() => null))
  active?.postMessage({ type: "CANCEL_REMINDER", id })
}

// ── Fire an immediate local notification (no SW needed) ───────────────────────
// Used as a fallback and for "send now" debug usage.
export function fireLocalNotification(
  matchTitle: string,
  teamName: string,
  competition?: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return

  // Desktop browsers support new Notification() directly.
  // Android Chrome requires SW-based showNotification(), handled by the SW itself.
  try {
    const n = new Notification(`⚽ ¡Empieza en 5 min! — ${teamName}`, {
      body: `${matchTitle}${competition ? `\n${competition}` : ""}`,
      icon: "/icon.svg",
      badge: "/icon-dark-32x32.png",
      silent: false,
    })
    n.onclick = () => window.focus()
  } catch {
    // Android Chrome throws here — SW path should have been used instead
  }
}

// ── Legacy compat (used in countdown-timer.tsx) ───────────────────────────────
// Kept for backward compatibility — schedules via SW when possible.
export function sendMatchReminder(
  matchTitle: string,
  kickoffDate: string,
  teamName: string,
  matchId?: string,
  competition?: string,
) {
  const id = matchId ?? `match-${encodeURIComponent(matchTitle)}`
  const kickoff = new Date(kickoffDate).getTime()

  scheduleMatchReminder({ id, matchTitle, teamName, kickoff, competition }).then(
    ({ ok, method, error }) => {
      if (!ok) {
        console.warn("[Notifications] Could not schedule reminder:", error)
        // Last resort: alert
        alert(
          `✅ Recordatorio guardado: ${matchTitle}\n` +
          `📲 Activa las notificaciones del navegador para recibir la alarma 5 min antes del partido.`,
        )
      } else if (method === "timeout") {
        console.info("[Notifications] Reminder via setTimeout (tab must stay open)")
      }
    },
  )
}
