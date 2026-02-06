// app/api/kyc-signup/route.ts
// Next.js API route to proxy requests to FastAPI backend

import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const email = formData.get('email') as string;
    const aadharFile = formData.get('aadhar_document') as File;
    const webcamImage = formData.get('webcam_image') as File;
    const enhanceDocument = formData.get('enhance_document') === 'true';
    const enhanceWebcam = formData.get('enhance_webcam') === 'true';
    
    // Validate required fields
    if (!email || !aadharFile || !webcamImage) {
      return NextResponse.json(
        { error: 'Missing required fields: email, aadhar_document, and webcam_image are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create FormData for FastAPI backend
    const backendFormData = new FormData();
    backendFormData.append('email', email);
    backendFormData.append('id_document', aadharFile);
    backendFormData.append('webcam_image', webcamImage);
    backendFormData.append('enhance_document', enhanceDocument.toString());
    backendFormData.append('enhance_webcam', enhanceWebcam.toString());
    
    // Forward to FastAPI backend
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/verify`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }

    const result = await response.json();
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('KYC Signup Error:', error);
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check verification status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' }, 
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FASTAPI_BACKEND_URL}/api/status?email=${encodeURIComponent(email)}`
    );
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Status Check Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}