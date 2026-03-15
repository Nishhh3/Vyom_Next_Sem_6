"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  fetchBalance,
  bankTheme,
  bankDisplayName,
  maskAccountNumberFull,
  formatINR,
} from "@/services/bankApi";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── OTP Modal ─────────────────────────────────────────────────
function OtpModal({
  maskedEmail,
  onVerify,
  onResend,
  onCancel,
  error,
}: {
  maskedEmail: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onCancel: () => void;
  error: string | null;
}) {
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [timer, setTimer]         = useState(120);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs                 = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Reset timer when resend happens
  const handleResend = async () => {
    setResending(true);
    setOtp(["", "", "", "", "", ""]);
    await onResend();
    setTimer(120);
    setResending(false);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setVerifying(true);
    await onVerify(code);
    setVerifying(false);
  };

  const minutes  = Math.floor(timer / 60);
  const seconds  = timer % 60;
  const expired  = timer === 0;
  const filled   = otp.join("").length === 6;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131f] border border-gray-700/50 rounded-2xl p-8 w-full max-w-md space-y-6 shadow-2xl">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-xl font-bold">Verify Transfer</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enter the 6-digit OTP sent to{" "}
            <span className="text-white font-medium">{maskedEmail}</span>
          </p>
        </div>

        {/* OTP Boxes */}
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl focus:outline-none transition-all ${
                error
                  ? "bg-red-500/10 border-2 border-red-500 text-red-400"
                  : digit
                  ? "bg-gray-800 border-2 border-red-500/60 text-white"
                  : "bg-gray-800 border-2 border-gray-700 text-white focus:border-red-500/60"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-center">
            <p className="text-red-400 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* Timer */}
        <div className="text-center">
          {expired ? (
            <p className="text-red-400 text-sm">OTP expired. Please resend.</p>
          ) : (
            <p className="text-gray-500 text-sm">
              Expires in{" "}
              <span className={`font-mono font-semibold ${timer <= 30 ? "text-red-400" : "text-white"}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </p>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleVerify}
          disabled={!filled || verifying || expired}
          className="w-full bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3.5 font-semibold transition-colors"
        >
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verifying...
            </span>
          ) : (
            "Confirm Transfer"
          )}
        </button>

        {/* Cancel + Resend */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResend}
            disabled={resending || (!expired && timer > 90)}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-2.5 text-sm font-medium transition-colors text-gray-300"
          >
            {resending ? "Sending..." : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Transfer Page ────────────────────────────────────────
export default function TransferPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const bankId    = params.bankId as string;
  const bank      = bankId.toUpperCase();
  const accountId = searchParams.get("account_id") ?? "";
  const theme     = bankTheme(bank);

  // Balance
  const [balanceData, setBalanceData] = useState<any>(null);
  const [balLoading, setBalLoading]   = useState(true);

  // Form
  const [toAccount, setToAccount] = useState("");
  const [toIfsc, setToIfsc]       = useState("");
  const [amount, setAmount]       = useState("");
  const [remarks, setRemarks]     = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // OTP
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpModal, setOtpModal]           = useState(false);
  const [maskedEmail, setMaskedEmail]     = useState("");
  const [otpError, setOtpError]           = useState<string | null>(null);

  // Result
  const [txResult, setTxResult] = useState<any>(null);

  useEffect(() => {
    if (!accountId) { router.push("/my-banks"); return; }
    fetchBalance(bank, accountId)
      .then(setBalanceData)
      .catch(() => {})
      .finally(() => setBalLoading(false));
  }, [bank, accountId]);

  const balance     = balanceData?.balance ?? 0;
  const accNumber   = balanceData ? maskAccountNumberFull(balanceData.account_number) : "—";
  const displayName = bankDisplayName(bank);

  // ── Validate form ──────────────────────────────────────────
  const validate = (): boolean => {
    setFormError(null);
    if (!toAccount.trim()) { setFormError("Beneficiary account number is required."); return false; }
    if (!toIfsc.trim() || toIfsc.length < 4) { setFormError("Enter a valid IFSC code."); return false; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setFormError("Enter a valid amount greater than 0."); return false; }
    if (Number(amount) > balance) { setFormError(`Insufficient balance. Available: ${formatINR(balance)}`); return false; }
    return true;
  };

  // ── Step 1: Request OTP ────────────────────────────────────
  const requestOtp = async () => {
    if (!validate()) return;
    setRequestingOtp(true);
    setOtpError(null);
    try {
      const res = await fetch(`${BASE}/api/transfer/request-otp`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          bank,
          account_id:        accountId,
          to_account_number: toAccount.trim(),
          to_ifsc:           toIfsc.toUpperCase(),
          amount:            Number(amount),
          remarks:           remarks.trim() || "Vyom Transfer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to send OTP.");
      setMaskedEmail(data.message.replace("OTP sent to ", ""));
      setOtpModal(true);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setRequestingOtp(false);
    }
  };

  // ── Step 2: Verify OTP + execute ──────────────────────────
  const executeTransfer = async (otp: string) => {
    setOtpError(null);
    try {
      const res = await fetch(`${BASE}/api/transfer/execute`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          bank,
          account_id:        accountId,
          to_account_number: toAccount.trim(),
          to_ifsc:           toIfsc.toUpperCase(),
          amount:            Number(amount),
          remarks:           remarks.trim() || "Vyom Transfer",
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.detail ?? "Verification failed.");
        return;
      }
      // Success
      setOtpModal(false);
      setTxResult(data);
      setToAccount(""); setToIfsc(""); setAmount(""); setRemarks("");
      // Refresh balance
      fetchBalance(bank, accountId).then(setBalanceData).catch(() => {});
    } catch (e: any) {
      setOtpError(e.message ?? "Transfer failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Back */}
        <button
          onClick={() => router.push(`/my-banks/${bankId}?account_id=${accountId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Bank Details</span>
        </button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">Transfer Money</h1>
          <p className="text-gray-400 text-lg">Send money from {displayName}</p>
        </div>

        {/* Success receipt */}
        {txResult && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <p className="text-green-400 font-bold text-lg">Transfer Successful</p>
              </div>
              <button
                onClick={() => setTxResult(null)}
                className="text-gray-500 hover:text-white text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-white text-base">{formatINR(txResult.amount)}</span>
              <span className="text-gray-500">UTR / Ref No.</span>
              <span className="font-mono text-xs text-gray-300">{txResult.ref_number}</span>
              <span className="text-gray-500">Balance after</span>
              <span className="text-gray-300">{formatINR(txResult.balance_after)}</span>
              <span className="text-gray-500">To account</span>
              <span className="font-mono text-xs text-gray-300">{txResult.to_account}</span>
              <span className="text-gray-500">IFSC</span>
              <span className="font-mono text-xs text-gray-300">{txResult.to_ifsc}</span>
              <span className="text-gray-500">Status</span>
              <span className="text-green-400 font-medium">{txResult.status}</span>
            </div>
          </div>
        )}

        {/* From Account Card */}
        <div className={`bg-gradient-to-br ${theme.gradient} border ${theme.border} rounded-2xl p-6 backdrop-blur-sm`}>
          <p className="text-gray-400 text-sm mb-3">From Account</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold">{displayName}</p>
              <p className="font-mono text-gray-300 text-sm mt-1">{accNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">Available Balance</p>
              {balLoading ? (
                <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">{formatINR(balance)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Transfer Form */}
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 lg:p-8 backdrop-blur-sm space-y-6">
          <h2 className="text-xl font-bold">Transfer Details</h2>

          <div className="space-y-5">
            {/* To Account */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">To Account Number *</label>
              <input
                type="text"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="Enter beneficiary account number"
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
              />
            </div>

            {/* IFSC */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">IFSC Code *</label>
              <input
                type="text"
                value={toIfsc}
                onChange={(e) => setToIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono uppercase"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Amount (₹) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={1}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              {!balLoading && (
                <p className="text-gray-600 text-xs">Available: {formatINR(balance)}</p>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Remark (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add a note for this transfer"
                rows={3}
                maxLength={100}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Form error */}
          {formError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">⚠️ {formError}</p>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={requestOtp}
            disabled={requestingOtp || !toAccount || !toIfsc || !amount}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
          >
            {requestingOtp ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending OTP...
              </>
            ) : (
              <>🔐 Send Money</>
            )}
          </button>
        </div>

        {/* Security note */}
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold mb-1">OTP Verified Transfer</h3>
              <p className="text-gray-400 text-sm">
                A 6-digit OTP will be sent to your registered email to confirm this transfer.
                OTP is valid for 2 minutes and can only be used once.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {otpModal && (
        <OtpModal
          maskedEmail={maskedEmail}
          onVerify={executeTransfer}
          onResend={requestOtp}
          onCancel={() => { setOtpModal(false); setOtpError(null); }}
          error={otpError}
        />
      )}
    </div>
  );
}