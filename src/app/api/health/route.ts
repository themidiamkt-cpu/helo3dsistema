import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "Mimagi 3D",
    modules: ["ops", "minerador-3d"],
    timestamp: new Date().toISOString(),
  });
}
