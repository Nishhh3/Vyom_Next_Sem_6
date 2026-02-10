import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/admin/kyc-users${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || `Backend responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin KYC users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC users' },
      { status: 500 }
    );
  }
}

