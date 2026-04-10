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
      error instanceof Error ? error.message : "API anahtarları alınamadı.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return errorResponse("Anahtar adı zorunludur.");
    }

    return NextResponse.json(createApiKey(name), { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "API anahtarı oluşturulamadı.",
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Silme işlemi için anahtar kimliği zorunludur.");
    }

    if (!deleteApiKey(id)) {
      return errorResponse("API anahtarı bulunamadı.", 404);
    }

    return NextResponse.json({
      ok: true,
      message: "API anahtarı silindi.",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "API anahtarı silinemedi.",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; is_active?: boolean };

    if (!body.id) {
      return errorResponse("Güncellenecek anahtar kimliği zorunludur.");
    }

    if (typeof body.is_active !== "boolean") {
      return errorResponse("is_active alanı boolean olmalıdır.");
    }

    if (!updateApiKeyActiveStatus(body.id, body.is_active)) {
      return errorResponse("API anahtarı bulunamadı.", 404);
    }

    const updated = getApiKeyById(body.id);

    if (!updated) {
      return errorResponse("Güncellenen API anahtarı okunamadı.", 500);
    }

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "API anahtarı güncellenemedi.",
      500,
    );
  }
}
