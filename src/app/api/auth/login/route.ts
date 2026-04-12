import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUser } from "@/lib/users-db";
import { createSessionToken } from "../register/route";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const user = verifyUser(normalizedUsername, password);
    
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

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
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
