import { NextResponse } from "next/server";

import { executeSqlStatements, getTableSchema } from "@/lib/db";
import {
  generateAlterTableSQL,
  normalizeIdentifier,
  tableSchemaToDefinition,
  type TableDefinition,
} from "@/lib/sql-generator";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ name: string; column: string }> },
) {
  try {
    const { name, column } = await context.params;
    const previous = tableSchemaToDefinition(await getTableSchema(name));
    const normalizedColumn = normalizeIdentifier(column);
    const next: TableDefinition = {
      ...previous,
      columns: previous.columns.filter(
        (item) => normalizeIdentifier(item.name) !== normalizedColumn,
      ),
    };

    if (next.columns.length === previous.columns.length) {
      return errorResponse("Silinecek sütun bulunamadı.", 404);
    }

    const statements = generateAlterTableSQL(name, {
      previous,
      next,
    });

    if (statements.length > 0) {
      await executeSqlStatements(statements);
    }

    return NextResponse.json({
      ok: true,
      statements,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Kolon silinemedi.",
      400,
    );
  }
}
