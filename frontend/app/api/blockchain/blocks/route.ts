// app/api/blockchain/blocks/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit  = searchParams.get('limit')  || '10';
    const offset = searchParams.get('offset') || '0';

    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/blockchain/blocks?limit=${limit}&offset=${offset}`,
      { method: 'GET', cache: 'no-store' }
    );

    const result = await response.json().catch(() => ({ blocks: [], total: 0 }));
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Blockchain blocks error:', error);
    return NextResponse.json({ blocks: [], total: 0 }, { status: 500 });
  }
}