import type { NextRequest } from "next/server";

export function assertAutomationSecret(request: NextRequest) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    throw new Error("CRON_SECRET nao configurado.");
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = request.headers.get("x-cron-secret");
  if (bearer !== configured && header !== configured) {
    throw new Error("Token de automacao invalido.");
  }
}
