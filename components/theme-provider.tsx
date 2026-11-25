"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"

export type ThemeMode = "beige" | "dark" | "system"
export type ResolvedTheme = "beige" | "dark"

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
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

const OPTIONS: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { id: "beige", label: "Beige", icon: <Sun className="h-3.5 w-3.5" /> },
  { id: "dark", label: "Oscuro", icon: <Moon className="h-3.5 w-3.5" /> },
  { id: "system", label: "Sistema", icon: <Monitor className="h-3.5 w-3.5" /> },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Selector de tema"
      className="inline-flex items-center rounded-xl border border-border bg-card/80 p-1 shadow-sm backdrop-blur-sm"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
