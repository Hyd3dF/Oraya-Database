import { NextResponse } from "next/server";

import { executeSql, executeSqlStatements, getTableSchema } from "@/lib/db";
import {
  generateAddColumnSQL,
  generateAlterTableSQL,
  normalizeIdentifier,
  sanitizeColumnDefinition,
  tableSchemaToDefinition,
  type ColumnDefinition,
  type TableDefinition,
} from "@/lib/sql-generator";

export const runtime = "nodejs";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await context.params;
    const body = (await request.json()) as { column?: ColumnDefinition };

    if (!body.column) {
      return errorResponse("Column definition not provided.", 400);
    }

    const schema = await getTableSchema(name);
    const nextColumn = sanitizeColumnDefinition(body.column);

    if (
      schema.columns.some(
        (column) => normalizeIdentifier(column.name) === normalizeIdentifier(nextColumn.name),
      )
    ) {
      return errorResponse("A column with the same name already exists.", 400);
    }

    const sql = generateAddColumnSQL(name, nextColumn);
    await executeSql(sql);

    return NextResponse.json({
      ok: true,
      sql,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to add column.",
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
    const body = (await request.json()) as {
      column?: ColumnDefinition;
      definition?: ColumnDefinition;
    };
    const nextColumn = body.column ?? body.definition;

    if (!nextColumn) {
      return errorResponse("Column definition not provided.", 400);
    }

    const previous = tableSchemaToDefinition(await getTableSchema(name));
    const sourceName = normalizeIdentifier(nextColumn.originalName ?? nextColumn.name);
    const existingColumn = previous.columns.find(
      (column) => normalizeIdentifier(column.name) === sourceName,
    );

    if (!existingColumn) {
      return errorResponse("Column to be updated not found.", 404);
    }

    const next: TableDefinition = {
      ...previous,
      columns: previous.columns.map((column) =>
        normalizeIdentifier(column.name) === sourceName
          ? sanitizeColumnDefinition({
              ...column,
              ...nextColumn,
              id: column.id,
              originalName: sourceName,
            })
          : column,
      ),
    };
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
      error instanceof Error ? error.message : "Failed to update column.",
      400,
    );
  }
}
