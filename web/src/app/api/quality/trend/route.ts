import { NextResponse } from "next/server";
import { getQualityTrend } from "@/lib/db/quality-queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(120, Math.max(7, Number(searchParams.get("days") ?? 30)));

  try {
    const trend = await getQualityTrend(days);
    return NextResponse.json({ trend });
  } catch (error) {
    console.error("[quality/trend]", error);
    return NextResponse.json({ trend: [] });
  }
}
