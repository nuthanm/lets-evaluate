import { NextResponse } from "next/server";
import { listQualityRunDates } from "@/lib/db/quality-queries";

export async function GET() {
  try {
    const dates = await listQualityRunDates(120);
    return NextResponse.json({ dates });
  } catch (error) {
    console.error("[quality/dates]", error);
    return NextResponse.json({ dates: [] });
  }
}
