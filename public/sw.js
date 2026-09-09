// ─── Fútbol Hub · Service Worker ─────────────────────────────────────────────
// Handles:
//   1. Background match-start reminder notifications (shown even when app is closed)
//   2. Audible alert via AudioContext on notification click (foreground) or
//      via a short beep encoded in the notification itself (background on Android)
//
// HOW THE REMINDER WORKS:
//   The page calls postMessage({ type: 'SCHEDULE_REMINDER', ... }) with the
//   kickoff timestamp and match info. The SW stores the pending reminder in
//   IndexedDB and checks every ~60 s. When the kickoff is ≤ 5 min away it
//   fires showNotification() which Android displays as a heads-up banner with
//   sound (device's default notification sound, honoring the user's volume).
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = "futbol-hub-sw";
const STORE   = "reminders";
const CHECK_INTERVAL_MS = 30_000; // check every 30 s
const ALERT_AHEAD_MS    = 5 * 60 * 1000; // notify 5 min before kick-off

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

async function saveReminder(reminder) {
  const db    = await openDB();
  const tx    = db.transaction(STORE, "readwrite");
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

// ── Notification display ──────────────────────────────────────────────────────
async function fireNotification(reminder) {
  const { id, matchTitle, teamName, kickoff, competition } = reminder;
  const minsLeft = Math.round((kickoff - Date.now()) / 60_000);
  const label    = minsLeft <= 1 ? "¡Comienza AHORA!" : `En ${minsLeft} min`;

  await self.registration.showNotification(`⚽ ${label} — ${teamName}`, {
    body:    `${matchTitle}\n${competition ?? ""}`,
    icon:    "/icon.svg",
    badge:   "/icon-dark-32x32.png",
    tag:     `reminder-${id}`,
    renotify: true,
    // vibrate pattern: long-short-long (Android)
    vibrate: [300, 100, 300, 100, 600],
    // silent: false  → uses device default notification sound on Android
    silent:  false,
    data:    { matchId: id },
    actions: [
      { action: "open",    title: "Ver partido" },
      { action: "dismiss", title: "Cerrar"      },
    ],
  });

  await deleteReminder(id);
}

// ── Periodic check ────────────────────────────────────────────────────────────
async function checkReminders() {
  let reminders;
  try { reminders = await getAllReminders(); }
  catch { return; }

  const now = Date.now();
  for (const r of reminders) {
    const timeLeft = r.kickoff - now;
    if (timeLeft <= ALERT_AHEAD_MS && timeLeft > -60_000) {
      // Inside the 5-min window (and match hasn't started more than 1 min ago)
      await fireNotification(r);
    } else if (timeLeft < -60_000) {
      // Match started > 1 min ago, clean up stale reminder
      await deleteReminder(r.id);
    }
  }
}

// ── Service Worker lifecycle ──────────────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
  // Kick off the periodic checker immediately after activation
  scheduleCheck();
});

let checkTimer = null;
function scheduleCheck() {
  if (checkTimer) return;
  checkTimer = setInterval(() => checkReminders(), CHECK_INTERVAL_MS);
}

// ── Message from page: SCHEDULE_REMINDER ─────────────────────────────────────
self.addEventListener("message", async (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === "SCHEDULE_REMINDER") {
    const { id, matchTitle, teamName, kickoff, competition } = msg;
    if (!id || !kickoff) return;

    await saveReminder({ id, matchTitle, teamName, kickoff, competition });
    scheduleCheck();

    // Acknowledge back to the page
    e.source?.postMessage({ type: "REMINDER_SAVED", id });
  }

  if (msg.type === "CANCEL_REMINDER") {
    await deleteReminder(msg.id);
  }

  if (msg.type === "LIST_REMINDERS") {
    const list = await getAllReminders();
    e.source?.postMessage({ type: "REMINDERS_LIST", list });
  }
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") return;

  // Focus or open the app
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return self.clients.openWindow("/");
      }),
  );
});
