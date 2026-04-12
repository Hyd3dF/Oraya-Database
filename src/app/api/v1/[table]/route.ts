import { NextResponse } from "next/server";

import { resolveApiKeyAccess } from "@/lib/api-keys-db";
import {
  getPagingParams,
  getTableDataForConnection,
  insertRowsForConnection,
  updateRowsForConnection,
  deleteRowsForConnection,
} from "@/lib/db";

export const runtime = "nodejs";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getApiKeyFromRequest(request: Request) {
  const bearerToken = request.headers.get("authorization");

  if (bearerToken?.toLowerCase().startsWith("bearer ")) {
    const apiKey = bearerToken.slice(7).trim();

    if (apiKey) {
      return apiKey;
    }
  }

  const headerApiKey = request.headers.get("x-api-key")?.trim();
  return headerApiKey ? headerApiKey : null;
}

function validateApiKeyAccess(request: Request) {
  const apiKey = getApiKeyFromRequest(request);

  if (!apiKey) {
    throw Object.assign(new Error("API key is required. Use the Authorization header or x-api-key."), {
      statusCode: 401,
    });
  }

  const access = resolveApiKeyAccess(apiKey);

  if (access.state === "missing") {
    throw Object.assign(new Error("API key is invalid."), { statusCode: 401 });
  }

  if (access.state === "inactive") {
    throw Object.assign(new Error("API key is inactive."), { statusCode: 403 });
  }

  if (access.state === "unbound") {
    throw Object.assign(
      new Error("This API key has no database binding. Create a new key while connected to a database."),
      { statusCode: 400 },
    );
  }

  return access;
}

function isRowPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeInsertRows(body: unknown) {
  if (Array.isArray(body)) {
    return body;
  }

  if (isRowPayload(body) && Array.isArray(body.rows)) {
    return body.rows;
  }

  if (isRowPayload(body)) {
    return [body];
  }

  throw new Error("POST body must be a JSON object, an array of objects, or { rows: [...] }.");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  try {
    const access = validateApiKeyAccess(request);
    const { table } = await context.params;
    const paging = getPagingParams(new URL(request.url).searchParams);
    const page = await getTableDataForConnection(access.connection, table, paging);

    return NextResponse.json(page);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unable to fetch table rows.",
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 400,
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  try {
    const access = validateApiKeyAccess(request);
    const { table } = await context.params;
    const body = await request.json();
    const rows = normalizeInsertRows(body);
    const result = await insertRowsForConnection(access.connection, table, rows);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unable to insert table rows.",
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 400,
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  try {
    const access = validateApiKeyAccess(request);
    const { table } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const body = await request.json();
    
    // We expect a single JSON object for update
    const result = await updateRowsForConnection(access.connection, table, searchParams, body);

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unable to update table rows.",
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 400,
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  try {
    const access = validateApiKeyAccess(request);
    const { table } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    
    const result = await deleteRowsForConnection(access.connection, table, searchParams);

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unable to delete table rows.",
      typeof error === "object" && error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 400,
    );
  }
}
