// app/api/blockchain/status/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/blockchain/status`,
      { method: 'GET', cache: 'no-store' }
    );

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Blockchain status error:', error);
    return NextResponse.json(
      { chain_locked: false, unresolved_alerts: 0, total_blocks: 0 },
      { status: 500 }
    );
  }
}