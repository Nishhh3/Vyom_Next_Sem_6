// app/api/blockchain/lock/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/blockchain/lock`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    );

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Blockchain lock error:', error);
    return NextResponse.json({ error: 'Failed to toggle lock' }, { status: 500 });
  }
}