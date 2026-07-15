import { NextResponse } from "next/server";
import { readMailAsset } from "@/lib/storage/assets";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;
  const joinedKey = key.join("/");

  if (!joinedKey.startsWith("Assets/")) {
    return new NextResponse("Invalid asset key", { status: 400 });
  }

  try {
    const asset = await readMailAsset(joinedKey);
    return new NextResponse(asset.body, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
