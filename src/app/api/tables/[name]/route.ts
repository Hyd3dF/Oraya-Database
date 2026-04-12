import { NextResponse } from "next/server";

import { executeSqlStatements, getTableSchema } from "@/lib/db";
import {
  generateAlterTableSQL,
  generateDropTableSQL,
  normalizeIdentifier,
  tableSchemaToDefinition,
  type TableDefinition,
} from "@/lib/sql-generator";

export const runtime = "nodejs";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await context.params;
    const schema = await getTableSchema(name);

    return NextResponse.json({
      definition: tableSchemaToDefinition(schema),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch table schema.",
      400,
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await context.params;
    const body = (await request.json()) as { definition?: TableDefinition };

    if (!body.definition) {
      return errorResponse("Definition is required in the request body.", 400);
    }

    const current = tableSchemaToDefinition(await getTableSchema(name));
    const statements = generateAlterTableSQL(name, {
      previous: current,
      next: body.definition,
    });

    if (statements.length > 0) {
      await executeSqlStatements(statements);
    }

    return NextResponse.json({
      ok: true,
      tableName: normalizeIdentifier(body.definition.tableName),
      statements,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update table.",
      400,
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await context.params;
    const body = (await request.json()) as { confirmName?: string };

    if (normalizeIdentifier(body.confirmName ?? "") !== normalizeIdentifier(name)) {
      return errorResponse("Table name verification failed.", 400);
    }

    const sql = generateDropTableSQL(name);
    await executeSqlStatements([sql]);

    return NextResponse.json({
      ok: true,
      droppedTable: normalizeIdentifier(name),
      sql,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete table.",
      400,
    );
  }
}
