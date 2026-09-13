"use client"

// ─── Fútbol Hub · Notification System ────────────────────────────────────────
// Usa el Service Worker (public/sw.js) + Web Notifications API para:
//   • Notificaciones audibles + visibles en Android (vía SW showNotification)
//   • Funciona en segundo plano / cuando la app está cerrada
//   • Fallback graceful en desktop/iOS donde SW push es limitado
//   • Envía pings periódicos para mantener el SW activo en Android
//
// FLUJO:
//   1. requestNotificationPermission() → pide permiso al usuario
//   2. scheduleMatchReminder()         → envía mensaje al SW con hora de kick-off
//   3. El SW guarda en IndexedDB y usa setTimeout recursivo (Android-safe)
//   4. El dispositivo vibra y suena 5 min antes del partido
// ─────────────────────────────────────────────────────────────────────────────

// ── Service Worker registration ───────────────────────────────────────────────
let swRegistration: ServiceWorkerRegistration | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null

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

// ── Obtener el SW activo (espera hasta 3 segundos si está instalando) ─────────
async function getActiveSW(): Promise<ServiceWorker | null> {
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

// ── Ping periódico para mantener el SW vivo en Android ───────────────────────
// Android puede suspender el SW entre eventos. Un ping desde la página
// cada 25 segundos (mientras hay recordatorios activos) fuerza al SW a
// despertar y comprobar si es hora de disparar la notificación.
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

  // Registrar el SW primero
  await registerServiceWorker()

  // Esperar a que el SW esté activo
  const active = await getActiveSW()

  if (active) {
    active.postMessage({
      type: "SCHEDULE_REMINDER",
      ...params,
    })
    // Arrancar el ping loop para mantener el SW vivo en Android
    startSwPingLoop()
    return { ok: true, method: "sw" }
  }

  // Fallback: setTimeout en página (sólo funciona si el tab sigue abierto)
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
  const active = await getActiveSW()
  active?.postMessage({ type: "CANCEL_REMINDER", id })
  // Detener pings si no quedan recordatorios
  active?.postMessage({ type: "LIST_REMINDERS" })
  navigator.serviceWorker.addEventListener(
    "message",
    (e) => {
      if (e.data?.type === "REMINDERS_LIST" && e.data.list?.length === 0) {
        stopSwPingLoop()
      }
    },
    { once: true },
  )
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

// ── Compatibilidad hacia atrás ────────────────────────────────────────────────
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
