import { NextResponse } from "next/server";

import {
  clearConnectionConfigCookie,
  getConnectionConfigFromCookies,
  getConnectionStatus,
  pingConnection,
  saveConnectionConfigToCookies,
  validateConnectionInput,
} from "@/lib/db";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const status = await getConnectionStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storedConfig = await getConnectionConfigFromCookies();
    const candidate =
      storedConfig &&
      typeof body?.password === "string" &&
      body.password.length === 0 &&
      body.host === storedConfig.host &&
      Number(body.port) === storedConfig.port &&
      body.user === storedConfig.user &&
      body.database === storedConfig.database
        ? { ...body, password: storedConfig.password }
        : body;
    const config = validateConnectionInput(candidate);

    await pingConnection(config);
    await saveConnectionConfigToCookies(config, request);

    const status = await getConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Connection could not be established.",
      400,
    );
  }
}

export async function DELETE() {
  await clearConnectionConfigCookie();

  return NextResponse.json({
    connected: false,
    configured: false,
    message: "Connection terminated.",
    checkedAt: new Date().toISOString(),
  });
}
