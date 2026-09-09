"use client"

import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/notifications"

/**
 * Invisible component that registers the Service Worker on first render.
 * Placed in the root layout so the SW is always active, enabling
 * background notifications even when the user navigates away.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
