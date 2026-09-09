"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type {
  LeagueCalendar,
  MatchDetail,
  NewsArticle,
  SquadPlayer,
  StandingRow,
  TeamData,
  TeamKey,
} from "@/lib/football-api"

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export function useTeamData(teamKey: TeamKey) {
  return useQuery({
    queryKey: ["team", teamKey],
    queryFn: () => getJson<TeamData>(`/api/team/${teamKey}`),
    refetchInterval: (query) => {
      const data = query.state.data
      const hasLive = data?.matches?.some((m) => m.state === "in")
      return hasLive ? 20000 : false
    },
  })
}

export function useStandings(teamKey: TeamKey, competition?: string) {
  return useQuery({
    queryKey: ["standings", teamKey, competition ?? "default"],
    queryFn: () =>
      getJson<StandingRow[]>(
        `/api/standings/${teamKey}${competition ? `?competition=${competition}` : ""}`,
      ),
  })
}

export function useLeagueCalendar(
  teamKey: TeamKey,
  date: string | null,
  competition?: string,
) {
  return useQuery({
    queryKey: ["league", teamKey, competition ?? "default", date ?? "next"],
    queryFn: () => {
      const params = new URLSearchParams()
      if (date) params.set("date", date)
      if (competition) params.set("competition", competition)
      const qs = params.toString()
      return getJson<LeagueCalendar>(`/api/league/${teamKey}${qs ? `?${qs}` : ""}`)
    },
    placeholderData: keepPreviousData, // keep matchday visible while navigating
  })
}

export function useTeamNews(teamKey: TeamKey) {
  return useQuery({
    queryKey: ["news", teamKey],
    queryFn: () => getJson<NewsArticle[]>(`/api/news/${teamKey}`),
  })
}

export function useTeamSquad(teamKey: TeamKey) {
  return useQuery({
    queryKey: ["squad", teamKey],
    queryFn: () => getJson<SquadPlayer[]>(`/api/squad/${teamKey}`),
  })
}

export function useMatchDetail(matchId: string | null, league = "esp.1") {
  return useQuery({
    queryKey: ["match", matchId, league],
    queryFn: () => (matchId ? getJson<MatchDetail>(`/api/match/${matchId}?league=${league}`) : null),
    enabled: Boolean(matchId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      // If the match is in progress, poll automatically every 15 seconds
      if (
        data.state === "in" ||
        (!data.completed && data.statusDetail?.toLowerCase().includes("vivo"))
      ) {
        return 15000
      }
      return false
    },
  })
}

