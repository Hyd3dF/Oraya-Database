import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Verify session securely on Edge Runtime
async function verifySessionTokenEdge(token: string) {
  try {
    const [userId, signature] = token.split(".");
    if (!userId || !signature) return false;

    const secret = process.env.DB_COOKIE_SECRET || "development-only-cookie-secret-change-me";
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(userId)
    );
    
    let expectedSigBase64Url = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
      
    // In some edge cases token signature might have padding diffs, let's just do a strict match
    return signature === expectedSigBase64Url;
  } catch (error) {
    return false;
  }
}

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/has-users"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always allow public paths and static assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") // e.g. favicon.ico, images
  ) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");
  const sessionCookie = request.cookies.get("oraya_session")?.value;

  if (!sessionCookie) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isValid = await verifySessionTokenEdge(sessionCookie);

  if (!isValid) {
    const response = isApiRoute 
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) 
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("oraya_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
