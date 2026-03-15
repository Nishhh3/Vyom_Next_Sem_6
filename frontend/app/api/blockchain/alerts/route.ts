// app/api/blockchain/alerts/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/blockchain/alerts`,
      { method: 'GET', cache: 'no-store' }
    );

    const result = await response.json().catch(() => ({ alerts: [] }));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Blockchain alerts error:', error);
    return NextResponse.json({ alerts: [] }, { status: 500 });
  }
}