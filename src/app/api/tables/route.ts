import { NextResponse } from "next/server";

import { executeSql, listTables } from "@/lib/db";
import {
  generateCreateTableSQL,
  normalizeIdentifier,
  type TableDefinition,
  validateTableDefinition,
} from "@/lib/sql-generator";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const tables = await listTables();
    return NextResponse.json({ tables });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Tablo listesi alınamadı.",
      400,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { definition?: TableDefinition };
    const definition = body.definition;

    if (!definition) {
      return errorResponse("İstek gövdesinde definition zorunludur.", 400);
    }

    const errors = validateTableDefinition(definition);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.map((e) => e.message).join(" ") },
        { status: 400 },
      );
    }

    const safeTableName = normalizeIdentifier(definition.tableName);
    const existingTables = await listTables();
    if (existingTables.some((t) => normalizeIdentifier(t.name) === safeTableName)) {
      return errorResponse(`"${definition.tableName}" tablosu zaten mevcut.`, 400);
    }

    const sql = generateCreateTableSQL(definition);
    await executeSql(sql);

    return NextResponse.json({
      ok: true,
      tableName: definition.tableName,
      sql,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Tablo oluşturulamadı.",
      400,
    );
  }
}