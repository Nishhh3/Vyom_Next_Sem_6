import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const id = context.params.id;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : undefined;

    const form = new FormData();
    if (reason) form.append('reason', reason);

    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/admin/kyc-users/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: form,
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
    console.error('Admin reject KYC error:', error);
    return NextResponse.json({ error: 'Failed to reject KYC' }, { status: 500 });
  }
}

