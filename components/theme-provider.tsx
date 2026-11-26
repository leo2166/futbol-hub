"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Check, Download, Monitor, Moon, Settings, Sun } from "lucide-react"

export type ThemeMode = "beige" | "dark" | "system"
export type ResolvedTheme = "beige" | "dark"

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const STORAGE_KEY = "futbol-hub-theme"

const ThemeContext = createContext<ThemeContextValue>({
  theme: "beige",
  resolvedTheme: "beige",
  setTheme: () => {},
})

function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark"
    }
    return "beige"
  }
  return mode
}

function applyThemeClass(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove("dark", "beige", "light")
  root.classList.add(resolved)
  root.style.colorScheme = resolved === "dark" ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("beige")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("beige")

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || "beige"
    const valid: ThemeMode = saved === "dark" || saved === "system" || saved === "beige" ? saved : "beige"
    setThemeState(valid)
    const resolved = resolveMode(valid)
    setResolvedTheme(resolved)
    applyThemeClass(resolved)
  }, [])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      const resolved = resolveMode("system")
      setResolvedTheme(resolved)
      applyThemeClass(resolved)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = (next: ThemeMode) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    const resolved = resolveMode(next)
    setResolvedTheme(resolved)
    applyThemeClass(resolved)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

const OPTIONS: { id: ThemeMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "beige", label: "Claro (Beige)", desc: "Fondo cálido beige", icon: <Sun className="h-4 w-4" /> },
  { id: "dark", label: "Oscuro", desc: "Modo nocturno", icon: <Moon className="h-4 w-4" /> },
  { id: "system", label: "Sistema", desc: "Según tu dispositivo", icon: <Monitor className="h-4 w-4" /> },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const handleInstallApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === "accepted") {
      setInstallPrompt(null)
    }
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {installPrompt && (
        <button
          type="button"
          onClick={handleInstallApp}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#004d98]/40 bg-gradient-to-r from-[#004d98] to-[#a50044] px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instalar App</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Configuración de tema"
        title="Tema y ajustes"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#004d98]/40 bg-card/90 text-[#a50044] shadow-sm transition-all hover:border-[#a50044] hover:bg-[#004d98]/10 active:scale-95"
      >
        <Settings className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-90 text-[#004d98]" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Opciones de tema"
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[#004d98]/30 bg-card shadow-xl backdrop-blur-md"
        >
          {/* Barra superior blaugrana */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#004d98] via-[#a50044] to-[#004d98]" />

          <div className="p-2">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Apariencia
            </p>
            <div className="mt-1 flex flex-col gap-1">
              {OPTIONS.map((opt) => {
                const active = theme === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setTheme(opt.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all ${
                      active
                        ? "bg-gradient-to-r from-[#004d98] to-[#a50044] text-white shadow-sm"
                        : "text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <span className={active ? "text-white" : "text-[#004d98] dark:text-[#6ea8fe]"}>
                      {opt.icon}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold">{opt.label}</div>
                      <div className={`text-[10px] ${active ? "text-white/80" : "text-muted-foreground"}`}>
                        {opt.desc}
                      </div>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
