import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createUser } from "@/lib/users-db";
import { createHmac } from "node:crypto";

// Helper to create a signed session token
export function createSessionToken(userId: string): string {
  const secret = process.env.DB_COOKIE_SECRET || "development-only-cookie-secret-change-me";
  const hmac = createHmac("sha256", secret);
  hmac.update(userId);
  const signature = hmac.digest("base64url");
  return `${userId}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const user = createUser(normalizedUsername, password);
    const token = createSessionToken(user.id);

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const requestUrlProto = request.url ? new URL(request.url).protocol.replace(":", "") : null;
    const originProto = request.headers.get("origin")?.split("://")[0]?.toLowerCase();
    const refererProto = request.headers.get("referer")?.split("://")[0]?.toLowerCase();
    const requestProtocol =
      forwardedProto?.split(",")[0]?.trim().toLowerCase() ??
      requestUrlProto ??
      originProto ??
      refererProto ??
      "http";
    const shouldUseSecureCookies = requestProtocol === "https";

    const cookieStore = await cookies();
    cookieStore.set("oraya_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Registration is disabled")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Registration failed. Username might be taken." },
      { status: 400 }
    );
  }
}
