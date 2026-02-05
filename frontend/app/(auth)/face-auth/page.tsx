'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/StepIndicator';

export default function FaceAuthPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError(
        'Camera access denied. Please allow camera permissions and reload the page.'
      );
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !isCameraReady) return;

    setIsCapturing(true);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
    }

    setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      router.push('/kyc-status');
    }, 800);
  };

  const steps = [
    { number: 1, label: 'Registration', status: 'completed' as const },
    { number: 2, label: 'Aadhaar', status: 'completed' as const },
    { number: 3, label: 'Face Auth', status: 'active' as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center px-4 pt-24 pb-12">
      {/* Step Indicator */}
      <StepIndicator steps={steps} />

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Face Verification
        </h1>
        <p className="text-sm text-gray-400">
          Position your face within the frame and capture
        </p>
      </div>

      {/* Camera Container */}
      <div className="w-full max-w-lg">
        <div className="relative bg-gray-950 border-2 border-gray-700 rounded-2xl overflow-hidden h-[500px] shadow-2xl">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <svg
                className="w-16 h-16 text-red-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-white font-medium mb-2">Camera Access Required</p>
              <p className="text-sm text-gray-400">{cameraError}</p>
            </div>
          ) : !isCameraReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-red-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400 text-sm">Initializing camera...</p>
            </div>
          ) : null}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {isCameraReady && (
            <>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-48 h-64">
                    <div className="absolute inset-0 border-4 border-red-500/30 rounded-full blur-sm"></div>
                    <div className="absolute inset-0 border-3 border-red-500/60 rounded-full"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-red-500"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-1 bg-red-500"></div>
                  </div>
                </div>

                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-white font-medium">Live</span>
                </div>

                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-3 text-xs text-gray-300">
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 text-yellow-400 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Good light
                    </span>
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 text-blue-400 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Look straight
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
                <button
                  onClick={handleCapture}
                  disabled={isCapturing}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/50 flex items-center justify-center space-x-2"
                >
                  {isCapturing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Capture Face</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
            <svg
              className="w-3 h-3 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Secure biometric verification • One-time use</span>
          </p>
        </div>
      </div>
    </div>
  );
}