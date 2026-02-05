'use client';

import { useRouter } from 'next/navigation';

export default function KYCStatusPage() {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen pt-24 px-4 bg-gradient-to-b from-gray-950 via-gray-900 to-black flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 lg:p-10 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              KYC Submitted Successfully
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Thank you for completing the verification process
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-5 py-2.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-sm font-medium text-yellow-500">
                Pending Admin Approval
              </span>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Verification Steps */}
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
              <p className="text-gray-300 font-medium mb-4">
                Verification Steps Completed
              </p>

              <ul className="space-y-4">
                {[
                  ['Registration Details', 'Name, email and mobile'],
                  ['Aadhaar Verification', 'Document uploaded'],
                  ['Face Authentication', 'Biometric captured'],
                ].map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {title}
                      </p>
                      <p className="text-gray-500 text-xs">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* What Happens Next */}
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
              <p className="text-gray-300 font-medium mb-4">
                What happens next?
              </p>

              <ol className="text-gray-400 text-sm space-y-3 list-decimal list-inside">
                <li>Admin team reviews your documents</li>
                <li>Credentials are generated after approval</li>
                <li>You receive login details via email</li>
                <li>Access your VyomNext dashboard</li>
              </ol>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-purple-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-purple-300 font-medium text-sm">
                  Expected Timeline
                </p>
                <p className="text-purple-400 text-xs">
                  Approval usually takes 24–48 hours (business days)
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGoToLogin}
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
            Go to Login
          </button>

          {/* Support */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a
                href="mailto:support@vyomnext.com"
                className="text-blue-500 hover:text-blue-400 transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>

          {/* Security */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
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
              Your data is encrypted and secure with blockchain technology
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}