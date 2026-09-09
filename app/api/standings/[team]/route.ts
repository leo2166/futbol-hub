import { NextResponse } from "next/server"
import { getStandings, TEAMS, type TeamKey } from "@/lib/football-api"

export const revalidate = 60

export async function GET(
  req: Request,
  { params }: { params: Promise<{ team: string }> },
) {
  const { team } = await params
  if (!(team in TEAMS)) {
    return NextResponse.json({ error: "Unknown team" }, { status: 404 })
  }
  const competition = new URL(req.url).searchParams.get("competition") ?? undefined
  try {
    const data = await getStandings(team as TeamKey, competition)
    return NextResponse.json(data)
  } catch (err) {
    console.log("[v0] standings route error:", (err as Error).message)
    return NextResponse.json(
      { error: "Failed to load standings from ESPN" },
      { status: 502 },
    )
  }
}
