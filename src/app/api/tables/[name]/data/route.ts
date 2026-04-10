import { NextResponse } from "next/server";

import { getPagingParams, getTableData } from "@/lib/db";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await context.params;
    const paging = getPagingParams(new URL(request.url).searchParams);
    const page = await getTableData(name, paging);

    return NextResponse.json(page);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Tablo verileri alınamadı.",
      400,
    );
  }
}
