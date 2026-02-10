import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const backendForm = new FormData();
    const userId = formData.get('user_id');
    const webcamImage = formData.get('webcam_image');

    if (typeof userId === 'string') backendForm.append('user_id', userId);
    if (webcamImage instanceof File) backendForm.append('webcam_image', webcamImage);

    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/login/face`, {
      method: 'POST',
      body: backendForm,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.detail || result?.error || `Backend responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Login face proxy error:', error);
    return NextResponse.json({ error: 'Failed to login with face' }, { status: 500 });
  }
}

