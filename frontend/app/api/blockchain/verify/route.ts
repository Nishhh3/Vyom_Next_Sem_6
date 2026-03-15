// app/api/blockchain/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/blockchain/verify`,
      { method: 'GET', cache: 'no-store' }
    );

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Blockchain verify error:', error);
    return NextResponse.json({ valid: false, message: 'Verify failed' }, { status: 500 });
  }
}