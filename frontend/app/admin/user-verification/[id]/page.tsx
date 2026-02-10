'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type VerificationReport = {
  timestamp?: string;
  aadhar_number?: string | null;
  verification_result?: {
    match?: boolean;
    confidence?: number;
    risk_score?: number;
    decision?: string;
  };
  settings?: {
    model?: string;
  };
};

type BackendUser = {
  id: number;
  email: string;
  aadhar_number?: string | null;
  user_id?: string | null;
  password?: string | null;
  status?: string | null;
  email_sent?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UserDetailsResponse = {
  success: boolean;
  user: BackendUser;
  images: {
    document_image?: string | null;
    registration_capture?: string | null;
    webcam_image?: string | null;
  };
  verification_report?: VerificationReport | null;
};

export default function UserVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id)
  ? params.id[0]
  : params.id;
  if (!id) {
  return <p className="text-red-500">Invalid user ID</p>;
}
  
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserDetailsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`http://localhost:8000/api/admin/kyc-users/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load user');
        }
        const json = (await res.json()) as UserDetailsResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const user = data?.user;
  const report = data?.verification_report;

  const ui = useMemo(() => {
    const statusRaw = (user?.status || 'PENDING').toUpperCase();
    const currentStatus =
      statusRaw === 'ACCEPTED' ? 'Approved' : statusRaw === 'REJECTED' ? 'Rejected' : 'Pending';

    const match = report?.verification_result?.match;
    const faceMatch = match === true ? 'Yes' : match === false ? 'No' : 'Pending';
    const confidence = report?.verification_result?.confidence ?? 0;
    const riskScore = report?.verification_result?.risk_score ?? 0;

    return { currentStatus, faceMatch, confidence, riskScore };
  }, [user?.status, report]);

  const handleApprove = async () => {
    if (!id) {
      alert("Invalid user ID");
      return;
    }
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/kyc-users/${encodeURIComponent(id)}/accept`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Accept failed');
      alert(
        `✅ User ACCEPTED!\n\nUser ID: ${body?.user_id}\nPassword: ${body?.password}\nEmail sent: ${body?.email_sent ? 'Yes' : 'No'}`
      );
      router.push('/admin/dashboard');
    } catch (e: any) {
      alert(e?.message || 'Failed to accept user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      alert('⚠️ Please provide remarks before rejecting.');
      return;
    }
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/kyc-users/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: remarks }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Reject failed');
      alert(`❌ User REJECTED.\n\nReason: ${remarks}`);
      router.push('/admin/dashboard');
    } catch (e: any) {
      alert(e?.message || 'Failed to reject user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPending = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/kyc-users/${encodeURIComponent(id)}/pending`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Reset failed');
      alert('🔄 Status reset to PENDING');
      router.push('/admin/dashboard');
    } catch (e: any) {
      alert(e?.message || 'Failed to reset');
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine risk level color
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskBg = (score: number) => {
    if (score < 30) return 'bg-green-500/10 border-green-500/30';
    if (score < 60) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-600/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
          <p className="text-gray-400 mb-6">{error || `The KYC record with ID "${id}" does not exist.`}</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white">KYC Verification</h1>
          <p className="text-gray-400 mt-1">User ID: <span className="text-red-500 font-mono">{id}</span></p>
        </div>

        {/* Status Badge */}
        <div>
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              ui.currentStatus === 'Approved'
                ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                : ui.currentStatus === 'Rejected'
                ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
            }`}
          >
            {ui.currentStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info & Verification Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Information Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              User Information
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Full Name</p>
                <p className="text-white font-medium">-</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Email Address</p>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Mobile Number</p>
                <p className="text-white font-medium">-</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Account Number</p>
                <p className="text-white font-mono text-sm">{user.user_id || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Submitted Date</p>
                <p className="text-white font-medium">{user.created_at ? String(user.created_at).slice(0, 19) : '-'}</p>
              </div>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verification Status
            </h2>
            <div className="space-y-4">
              {/* Aadhaar Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Aadhaar Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.aadhar_number
                      ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                  }`}
                >
                  {user.aadhar_number ? 'Verified' : 'Pending'}
                </span>
              </div>

              {/* Face Match */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Face Match</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    ui.faceMatch === 'Yes'
                      ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                      : ui.faceMatch === 'No'
                      ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                      : 'bg-gray-500/10 text-gray-500 border border-gray-500/30'
                  }`}
                >
                  {ui.faceMatch}
                </span>
              </div>

              {/* Confidence */}
              {ui.confidence > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Confidence</span>
                    <span className="text-white font-bold">{ui.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        ui.confidence >= 90
                          ? 'bg-green-500'
                          : ui.confidence >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, ui.confidence))}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Risk Score */}
              {ui.riskScore > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Risk Score</span>
                    <span className={`font-bold ${getRiskColor(ui.riskScore)}`}>
                      {ui.riskScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        ui.riskScore < 30
                          ? 'bg-green-500'
                          : ui.riskScore < 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, ui.riskScore))}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {ui.riskScore < 30 ? 'Low Risk' : ui.riskScore < 60 ? 'Medium Risk' : 'High Risk'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Documents & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview Section */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Document Verification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aadhaar Document */}
              <div>
                <p className="text-sm text-gray-400 mb-3">Aadhaar Document</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors duration-200">
                  <img
                    src={
                      data?.images?.document_image?.startsWith('data:image')
                        ? data.images.document_image
                        : 'https://placehold.co/600x400/1e293b/f1f5f9?text=No+Document'
                    }
                    alt="Aadhaar Document"
                  />
                  <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    View Full Size
                  </button>
                </div>
              </div>

              {/* Face Capture */}
              <div>
                <p className="text-sm text-gray-400 mb-3">Face Capture</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors duration-200">
                  <img
                    src={data?.images?.registration_capture || data?.images?.webcam_image || 'https://placehold.co/400x400/1e293b/f1f5f9?text=No+Capture'}
                    alt="Face Capture"
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    View Full Size
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions Section */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Admin Actions
            </h2>

            <div className="space-y-4">
              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Remarks <span className="text-gray-600">(Optional for approval, required for rejection)</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                  placeholder="Enter your remarks or reason for rejection..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleApprove}
                  disabled={isProcessing || ui.currentStatus === 'Approved'}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-semibold flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve KYC
                    </>
                  )}
                </button>

                <button
                  onClick={handleReject}
                  disabled={isProcessing || ui.currentStatus === 'Rejected'}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-semibold flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject KYC
                    </>
                  )}
                </button>
              </div>

              {ui.currentStatus !== 'Pending' && (
                <div className={`mt-4 p-4 ${getRiskBg(ui.riskScore)} rounded-lg`}>
                  <p className="text-gray-200 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This KYC record has already been {ui.currentStatus.toLowerCase()}. You can reset it to pending if needed.
                  </p>
                  <button
                    onClick={handleResetPending}
                    disabled={isProcessing}
                    className="mt-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg transition-colors duration-200 text-sm font-medium"
                  >
                    Reset to Pending
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}