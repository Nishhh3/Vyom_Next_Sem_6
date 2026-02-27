import { NextRequest, NextResponse } from "next/server";

const FASTAPI_BACKEND_URL = "http://localhost:8000";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;   // ✅ REQUIRED in Next 15

    if (!id) {
      return NextResponse.json(
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/admin/kyc-users/${encodeURIComponent(id)}/accept`,
      { method: "POST" }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Accept failed" },
      { status: 500 }
    );
  }
}