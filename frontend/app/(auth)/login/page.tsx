'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginMethod = 'password' | 'face';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [faceUserId, setFaceUserId] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  // Face login states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Start camera when switching to face login
  useEffect(() => {
    if (loginMethod === 'face') {
      startCamera();
    } else {
      // Stop camera when switching away
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
        setIsCameraReady(false);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [loginMethod]);

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
      setCameraError('Camera access denied. Please enable camera permissions.');
    }
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) return alert('Enter username');
    if (!formData.password.trim()) return alert('Enter password');

    (async () => {
      try {
        setServerError(null);

        const form = new FormData();
        form.append('user_id', formData.username);
        form.append('password', formData.password);

        const res = await fetch('http://127.0.0.1:8000/api/login/password', {
          method: 'POST',
          body: form,
          credentials: 'include', // ⭐ IMPORTANT
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Login failed');

        // store access token
        localStorage.setItem('access_token', data.access_token);

        router.push('/dashboard');
      } catch (err: any) {
        setServerError(err?.message || 'Login failed');
      }
    })();
  };

  const handleFaceLogin = async () => {
    if (!videoRef.current || !isCameraReady) return;
    if (!faceUserId.trim()) {
      alert('Please enter your User ID (e.g. VYM123456)');
      return;
    }

    setIsAuthenticating(true);
    setServerError(null);

    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg')
      );
      if (!blob) throw new Error('Failed to capture image from camera');

      const form = new FormData();
      form.append('user_id', faceUserId.trim());
      form.append('webcam_image', new File([blob], 'webcam.jpg', { type: 'image/jpeg' }));

      const res = await fetch('http://127.0.0.1:8000/api/login/face', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Face login failed');

      localStorage.setItem('access_token', data.access_token);

      if (stream) stream.getTracks().forEach((t) => t.stop());
      router.push('/dashboard');
    } catch (err: any) {
      setServerError(err?.message || 'Face login failed');
      setIsAuthenticating(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 pt-24 pb-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Sign in to access your VyomNext account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          {serverError && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm">
              {serverError}
            </div>
          )}
          {/* Login Method Tabs */}
          <div className="flex gap-2 p-1 bg-gray-950 rounded-lg mb-6">
            <button
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                loginMethod === 'password'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Password Login
            </button>
            <button
              onClick={() => setLoginMethod('face')}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                loginMethod === 'face'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Face Login
            </button>
          </div>

          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              {/* Username/Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username or Email
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={handleChange('username')}
                    placeholder="Enter your username or email"
                    required
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-500"
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
                  </div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={handleChange('password')}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Info Box */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400">
                    Face login available for faster access. Switch to the Face Login tab.
                  </p>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
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
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Login
              </button>
            </form>
          )}

          {/* Face Login UI */}
          {loginMethod === 'face' && (
            <div className="space-y-5">
              {/* User ID input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User ID <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={faceUserId}
                  onChange={(e) => setFaceUserId(e.target.value)}
                  placeholder="VYM123456"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* Camera Preview */}
              <div className="relative bg-gray-950 border-2 border-gray-700 rounded-xl overflow-hidden h-[400px]">
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
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Face Guide Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-40 h-52">
                        <div className="absolute inset-0 border-4 border-red-500/30 rounded-full blur-sm"></div>
                        <div className="absolute inset-0 border-3 border-red-500/60 rounded-full"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-red-500"></div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-1 bg-red-500"></div>
                      </div>
                    </div>

                    {/* Live Indicator */}
                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs text-white font-medium">Live</span>
                    </div>

                    {/* Helper Text */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <p className="text-white text-sm font-medium bg-black/60 backdrop-blur-sm inline-block px-4 py-2 rounded-lg">
                        Align your face within the frame
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Face Login Button */}
              <button
                onClick={handleFaceLogin}
                disabled={!isCameraReady || isAuthenticating}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
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
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span>Login with Face</span>
                  </>
                )}
              </button>

              {/* Alternative Option */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-gray-400">
                    Having trouble? Switch to Password Login for traditional access.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-red-500 hover:text-red-400 font-medium transition-colors"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Secured by blockchain technology and military-grade encryption</span>
          </p>
        </div>
      </div>
    </div>
  );
}