import { NextResponse } from "next/server";
import { hasAnyUser } from "@/lib/users-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasUsers = hasAnyUser();
    return NextResponse.json({ hasUsers });
  } catch (error) {
    return NextResponse.json({ hasUsers: false, error: "Database error" }, { status: 500 });
  }
}
