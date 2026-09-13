// ─── Fútbol Hub · Service Worker ─────────────────────────────────────────────
// Maneja notificaciones de recordatorio de partidos en segundo plano.
//
// PROBLEMA EN ANDROID: setInterval() se pierde cuando Android mata el SW entre
// eventos. Solución: chequear reminders directamente en cada evento y usar
// waitUntil() para mantener el SW despierto el tiempo necesario.
//
// FLUJO:
//   1. La página llama postMessage({ type: 'SCHEDULE_REMINDER', ... })
//   2. El SW guarda el recordatorio en IndexedDB y chequea inmediatamente
//   3. El SW también chequea en cada 'activate' y usando setTimeout recursivo
//   4. Cuando el partido está a ≤5 min → showNotification() con sonido + vibración
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME   = "futbol-hub-sw";
const STORE     = "reminders";
const ALERT_AHEAD_MS    = 5 * 60 * 1000; // 5 min antes del kick-off
const CHECK_INTERVAL_MS = 30_000;        // intervalo de revisión: 30 segundos

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function saveReminder(reminder) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(reminder);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

async function getAllReminders() {
  const db  = await openDB();
  const tx  = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll();
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function deleteReminder(id) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

// ── Mostrar notificación ──────────────────────────────────────────────────────
async function fireNotification(reminder) {
  const { id, matchTitle, teamName, kickoff, competition } = reminder;
  const minsLeft = Math.round((kickoff - Date.now()) / 60_000);
  const label    = minsLeft <= 1 ? "¡Comienza AHORA!" : `En ${minsLeft} min`;

  await self.registration.showNotification(`⚽ ${label} — ${teamName}`, {
    body:    `${matchTitle}${competition ? `\n${competition}` : ""}`,
    icon:    "/apple-icon.png",
    badge:   "/icon-dark-32x32.png",
    tag:     `reminder-${id}`,
    renotify: true,
    vibrate: [400, 150, 400, 150, 800],
    silent:  false,
    requireInteraction: true,
    data:    { matchId: id, url: "/" },
    actions: [
      { action: "open",    title: "Ver partido 🏟️" },
      { action: "dismiss", title: "Cerrar"         },
    ],
  });

  await deleteReminder(id);
}

// ── Verificar recordatorios pendientes ────────────────────────────────────────
async function checkReminders() {
  let reminders;
  try { reminders = await getAllReminders(); }
  catch { return; }

  const now = Date.now();
  for (const r of reminders) {
    const timeLeft = r.kickoff - now;
    if (timeLeft <= ALERT_AHEAD_MS && timeLeft > -90_000) {
      // Dentro de la ventana de 5 min (o hasta 1.5 min después de arrancar)
      try { await fireNotification(r); } catch (e) { console.error("[SW] Error firing notification:", e); }
    } else if (timeLeft < -90_000) {
      // Partido ya empezó hace más de 1.5 min → limpiar
      await deleteReminder(r.id);
    }
  }
}

// ── setTimeout recursivo (Android-safe) ──────────────────────────────────────
// A diferencia de setInterval, cada setTimeout mantiene el SW "mini-despierto"
// solo el tiempo necesario sin romper el ciclo cuando Android lo suspende,
// porque el próximo setTimeout se registra en el evento de message si llega.
let loopActive = false;

function startCheckLoop() {
  if (loopActive) return;
  loopActive = true;

  async function tick() {
    await checkReminders();
    // ¿Quedan recordatorios? Si no, detener el loop para no desperdiciar batería
    let remaining;
    try { remaining = await getAllReminders(); } catch { remaining = []; }
    if (remaining.length > 0) {
      setTimeout(tick, CHECK_INTERVAL_MS);
    } else {
      loopActive = false;
    }
  }

  setTimeout(tick, CHECK_INTERVAL_MS);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    self.clients.claim().then(() => checkReminders())
  );
});

// ── Mensajes desde la página ──────────────────────────────────────────────────
self.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === "SCHEDULE_REMINDER") {
    const { id, matchTitle, teamName, kickoff, competition } = msg;
    if (!id || !kickoff) return;

    // Guardar y verificar inmediatamente (sin esperar el próximo tick)
    e.waitUntil(
      saveReminder({ id, matchTitle, teamName, kickoff, competition })
        .then(() => {
          // Verificar si ya está a ≤5 min y lanzar la notificación si corresponde
          checkReminders();
          // Iniciar el loop de comprobación periódica
          startCheckLoop();
          // Confirmar a la página
          e.source?.postMessage({ type: "REMINDER_SAVED", id });
        })
    );
  }

  if (msg.type === "CANCEL_REMINDER") {
    e.waitUntil(deleteReminder(msg.id));
  }

  if (msg.type === "LIST_REMINDERS") {
    e.waitUntil(
      getAllReminders().then((list) => {
        e.source?.postMessage({ type: "REMINDERS_LIST", list });
      })
    );
  }

  // Ping para mantener el SW despierto y relanzar el loop si fue suspendido
  if (msg.type === "PING") {
    e.waitUntil(
      getAllReminders().then((list) => {
        if (list.length > 0) startCheckLoop();
        e.source?.postMessage({ type: "PONG" });
      })
    );
  }
});

// ── Clic en notificación ──────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") return;

  const targetUrl = e.notification.data?.url ?? "/";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
