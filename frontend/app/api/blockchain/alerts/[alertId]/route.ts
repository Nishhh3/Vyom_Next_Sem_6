// app/api/blockchain/alerts/[alertId]/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/blockchain/alerts/${params.alertId}/resolve`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Blockchain resolve alert error:', error);
    return NextResponse.json({ error: 'Failed to resolve alert' }, { status: 500 });
  }
}