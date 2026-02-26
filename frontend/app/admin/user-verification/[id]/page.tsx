'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type BackendUser = {
  id: number;
  email: string;
  aadhar_number?: string | null;
  user_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  document_url?: string | null;
  capture_url?: string | null;
  webcam_url?: string | null;
};

type VerificationReport = {
  face_match?: {
    match?: boolean;
    confidence?: number;
    distance?: number;
  };
  risk_score?: number;
};

type UserDetailsResponse = {
  success: boolean;
  user: BackendUser;
  verification_report?: VerificationReport | null;
};

export default function UserVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserDetailsResponse | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(
          `http://localhost:8000/api/admin/kyc-users/${id}`,
          { cache: 'no-store' }
        );

        if (!res.ok) throw new Error('Failed to load user');

        const json = await res.json();

        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
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
  const verification = data?.verification_report;

  const ui = useMemo(() => {
    const statusRaw = (user?.status || 'PENDING').toUpperCase();

    const currentStatus =
      statusRaw === 'ACCEPTED'
        ? 'Approved'
        : statusRaw === 'REJECTED'
        ? 'Rejected'
        : 'Pending';

    const faceMatch =
      verification?.face_match?.match === true
        ? 'Yes'
        : verification?.face_match?.match === false
        ? 'No'
        : 'Pending';

    return { currentStatus, faceMatch };
  }, [user?.status, verification]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setIsProcessing(true);
      await fetch(`/api/admin/kyc-users/${id}/accept`, { method: 'POST' });
      router.push('/admin/dashboard');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!id || !remarks.trim()) return;
    try {
      setIsProcessing(true);
      await fetch(`/api/admin/kyc-users/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: remarks }),
      });
      router.push('/admin/dashboard');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (error || !user) return <p className="text-red-500">User not found</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-gray-400 hover:text-white mb-2"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-white">
            KYC Verification
          </h1>

          <p className="text-gray-400">User ID: {id}</p>
        </div>

        <span
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            ui.currentStatus === 'Approved'
              ? 'bg-green-500/10 text-green-500'
              : ui.currentStatus === 'Rejected'
              ? 'bg-red-500/10 text-red-500'
              : 'bg-yellow-500/10 text-yellow-500'
          }`}
        >
          {ui.currentStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* USER INFO */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">
              User Information
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="text-white">{user.email}</p>
              </div>

              <div>
                <p className="text-gray-500">User ID</p>
                <p className="text-white">{user.user_id || '-'}</p>
              </div>

              <div>
                <p className="text-gray-500">Submitted</p>
                <p className="text-white">
                  {user.created_at?.slice(0, 19) || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">
              Verification Status
            </h2>

            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Aadhaar</span>
              <span className="text-green-500">
                {user.aadhar_number ? 'Verified' : 'Pending'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Face Match</span>
              <span
                className={
                  ui.faceMatch === 'Yes'
                    ? 'text-green-500'
                    : ui.faceMatch === 'No'
                    ? 'text-red-500'
                    : 'text-gray-400'
                }
              >
                {ui.faceMatch}
              </span>
            </div>
          </div>

          {/* FACE REPORT */}
          {verification && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">
                Face Verification
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Match</span>
                  <span
                    className={
                      verification.face_match?.match
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  >
                    {verification.face_match?.match
                      ? 'Matched'
                      : 'Not Matched'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Confidence</span>
                  <span className="text-white">
                    {verification.face_match?.confidence?.toFixed(1) ?? 0}%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Distance</span>
                  <span className="text-white">
                    {verification.face_match?.distance?.toFixed(3) ?? '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* RISK */}
          {verification?.risk_score !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">
                Risk Assessment
              </h2>

              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Risk Score</span>
                <span className="text-white font-bold">
                  {verification.risk_score.toFixed(1)}
                </span>
              </div>

              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    verification.risk_score < 30
                      ? 'bg-green-500'
                      : verification.risk_score < 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      verification.risk_score
                    )}%`,
                  }}
                />
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {verification.risk_score < 30
                  ? 'Low Risk'
                  : verification.risk_score < 60
                  ? 'Medium Risk'
                  : 'High Risk'}
              </p>
            </div>
          )}
        </div>

        {/* IMAGES + ACTIONS */}
        <div className="lg:col-span-2 space-y-6">
          {/* IMAGES */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">
              Documents
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 mb-2">Aadhaar</p>
                <img
                  src={
                    user.document_url ||
                    'https://placehold.co/600x400?text=No+Document'
                  }
                  className="rounded-lg border border-white/10"
                />
              </div>

              <div>
                <p className="text-gray-400 mb-2">Face Capture</p>
                <img
                  src={
                    user.capture_url ||
                    user.webcam_url ||
                    'https://placehold.co/400x400?text=No+Face'
                  }
                  className="rounded-lg border border-white/10"
                />
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">
              Admin Actions
            </h2>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white mb-4"
              placeholder="Remarks..."
            />

            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
              >
                Approve
              </button>

              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}