import { NextResponse } from "next/server";

import {
  createApiKey,
  deleteApiKey,
  getAllApiKeys,
  getApiKeyById,
  updateApiKeyActiveStatus,
} from "@/lib/api-keys-db";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    return NextResponse.json(getAllApiKeys());
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch API keys.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return errorResponse("Key name is required.");
    }

    return NextResponse.json(createApiKey(name), { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create API key.",
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Key ID is required for deletion.");
    }

    if (!deleteApiKey(id)) {
      return errorResponse("API key not found.", 404);
    }

    return NextResponse.json({
      ok: true,
      message: "API key deleted.",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete API key.",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; is_active?: boolean };

    if (!body.id) {
      return errorResponse("Key ID for update is required.");
    }

    if (typeof body.is_active !== "boolean") {
      return errorResponse("is_active field must be a boolean.");
    }

    if (!updateApiKeyActiveStatus(body.id, body.is_active)) {
      return errorResponse("API key not found.", 404);
    }

    const updated = getApiKeyById(body.id);

    if (!updated) {
      return errorResponse("Failed to read updated API key.", 500);
    }

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update API key.",
      500,
    );
  }
}
