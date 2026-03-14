"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSessionGuard } from "@/hooks/useSessionGuard"; // ← ADD line 4

// ─── Types ────────────────────────────────────────────────────────────────────
interface DigiDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface ViewingDoc extends DigiDocument {
  dataUrl?: string;
  loading?: boolean;
}

// Screen states for the PIN gate
type Screen =
  | "loading"       // checking pin status from API
  | "create_pin"    // first time — set a new PIN
  | "enter_pin"     // returning user — verify PIN
  | "vault"         // PIN verified — show documents
  | "change_pin";   // user wants to change their PIN

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ─── Auth ─────────────────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) return { Authorization: `Bearer ${token}` };
  // Dev fallback
  return { "X-User-Email": "dev@example.com" };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...getAuthHeaders(), ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getFileIcon(mimeType: string): { color: string; label: string } {
  if (mimeType === "application/pdf")
    return { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "PDF" };
  if (mimeType.startsWith("image/"))
    return { color: "text-purple-400 bg-purple-500/10 border-purple-500/20", label: "IMG" };
  if (mimeType.includes("word"))
    return { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "DOC" };
  if (mimeType.includes("excel") || mimeType.includes("sheet"))
    return { color: "text-green-400 bg-green-500/10 border-green-500/20", label: "XLS" };
  return { color: "text-gray-400 bg-gray-500/10 border-gray-500/20", label: "FILE" };
}

// ─── PIN Input Component ──────────────────────────────────────────────────────
function PinInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split("");
    arr[index] = char;
    const next = arr.join("").slice(0, 4);
    onChange(next);
    if (char && index < 3) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const arr = value.split("");
      arr[index - 1] = "";
      onChange(arr.join(""));
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-14 h-14 text-center text-2xl font-bold bg-gray-800 border-2 border-gray-600 rounded-xl text-white focus:border-red-500 focus:outline-none transition-colors disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ─── Create PIN Screen ────────────────────────────────────────────────────────
function CreatePinScreen({ onCreated }: { onCreated: () => void }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (pin.length !== 4) { setError("Enter all 4 digits."); return; }
    setError("");
    setStep("confirm");
  };

  const handleCreate = async () => {
    if (confirmPin !== pin) {
      setError("PINs do not match. Try again.");
      setConfirmPin("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/digilocker/pin/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      onCreated();
    } catch (e: any) {
      setError(e.message ?? "Failed to set PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PinGateWrapper
      icon="🔐"
      title="Create Your PIN"
      subtitle={
        step === "enter"
          ? "Set a 4-digit PIN to secure your DigiLocker"
          : "Re-enter your PIN to confirm"
      }
    >
      {step === "enter" ? (
        <>
          <PinInput value={pin} onChange={setPin} disabled={loading} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleNext}
            disabled={pin.length !== 4 || loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <PinInput value={confirmPin} onChange={setConfirmPin} disabled={loading} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={confirmPin.length !== 4 || loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
          >
            {loading ? "Setting PIN..." : "Confirm & Create"}
          </button>
          <button
            onClick={() => { setStep("enter"); setConfirmPin(""); setError(""); }}
            className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back
          </button>
        </>
      )}
    </PinGateWrapper>
  );
}

// ─── Enter PIN Screen ─────────────────────────────────────────────────────────
function EnterPinScreen({ onVerified }: { onVerified: () => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) handleVerify(pin);
  }, [pin]);

  const handleVerify = async (p: string) => {
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/digilocker/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });
      onVerified();
    } catch (e: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(
        newAttempts >= 3
          ? `Incorrect PIN (${newAttempts} attempts). Please try again.`
          : "Incorrect PIN. Please try again."
      );
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PinGateWrapper
      icon="🔒"
      title="Enter Your PIN"
      subtitle="Enter your 4-digit PIN to access your DigiLocker"
    >
      <PinInput value={pin} onChange={setPin} disabled={loading} />
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      {loading && (
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      )}
    </PinGateWrapper>
  );
}

// ─── Change PIN Screen ────────────────────────────────────────────────────────
function ChangePinScreen({ onDone }: { onDone: () => void }) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"old" | "new" | "confirm">("old");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async () => {
    if (confirmPin !== newPin) {
      setError("New PINs do not match.");
      setConfirmPin("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/digilocker/pin/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_pin: oldPin, new_pin: newPin }),
      });
      onDone();
    } catch (e: any) {
      setError(e.message ?? "Failed to change PIN.");
      if (e.message?.includes("incorrect")) {
        setStep("old");
        setOldPin("");
        setNewPin("");
        setConfirmPin("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PinGateWrapper
      icon="🔑"
      title="Change PIN"
      subtitle={
        step === "old"
          ? "Enter your current PIN"
          : step === "new"
          ? "Enter your new 4-digit PIN"
          : "Confirm your new PIN"
      }
    >
      {step === "old" && (
        <>
          <PinInput value={oldPin} onChange={setOldPin} disabled={loading} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={() => { if (oldPin.length === 4) { setError(""); setStep("new"); } }}
            disabled={oldPin.length !== 4}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
          >
            Continue
          </button>
        </>
      )}
      {step === "new" && (
        <>
          <PinInput value={newPin} onChange={setNewPin} disabled={loading} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={() => { if (newPin.length === 4) { setError(""); setStep("confirm"); } }}
            disabled={newPin.length !== 4}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
          >
            Continue
          </button>
          <button onClick={() => setStep("old")} className="w-full py-2 text-gray-400 hover:text-white text-sm">← Back</button>
        </>
      )}
      {step === "confirm" && (
        <>
          <PinInput value={confirmPin} onChange={setConfirmPin} disabled={loading} />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleChange}
            disabled={confirmPin.length !== 4 || loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
          >
            {loading ? "Changing..." : "Confirm Change"}
          </button>
          <button onClick={() => setStep("new")} className="w-full py-2 text-gray-400 hover:text-white text-sm">← Back</button>
        </>
      )}
      <button
        onClick={onDone}
        className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        Cancel
      </button>
    </PinGateWrapper>
  );
}

// ─── Shared PIN Gate Wrapper ──────────────────────────────────────────────────
function PinGateWrapper({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600/30 to-orange-600/20 border border-red-500/30 flex items-center justify-center mx-auto text-4xl">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Main Vault Screen ────────────────────────────────────────────────────────
function VaultScreen({ onLock, onChangePin }: { onLock: () => void; onChangePin: () => void }) {
  const [documents, setDocuments] = useState<DigiDocument[]>([]);
  const [stats, setStats] = useState({ count: 0, totalSize: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ViewingDoc | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDocuments = useCallback(async () => {
    try {
      const [docsRes, statsRes] = await Promise.all([
        apiFetch("/api/digilocker/documents"),
        apiFetch("/api/digilocker/stats"),
      ]);
      setDocuments(docsRes.documents ?? []);
      setStats({ count: statsRes.count, totalSize: statsRes.totalSize });
    } catch (e: any) {
      showToast(e.message ?? "Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      showToast(`File too large. Max ${MAX_SIZE_MB}MB.`, "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/digilocker/upload`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail);
      }
      await fetchDocuments();
      showToast(`"${file.name}" uploaded successfully`);
    } catch (e: any) {
      showToast(e.message ?? "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fetchDocuments]);

  const handleView = async (doc: DigiDocument) => {
    setViewingDoc({ ...doc, loading: true });
    try {
      const res = await apiFetch(`/api/digilocker/documents/${doc.id}/dataurl`);
      setViewingDoc({ ...doc, dataUrl: res.dataUrl, loading: false });
    } catch (e: any) {
      setViewingDoc(null);
      showToast(e.message ?? "Failed to load document", "error");
    }
  };

  const handleDelete = async (doc: DigiDocument) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/digilocker/documents/${doc.id}`, { method: "DELETE" });
      if (viewingDoc?.id === doc.id) setViewingDoc(null);
      await fetchDocuments();
      showToast(`"${doc.name}" deleted`);
    } catch (e: any) {
      showToast(e.message ?? "Delete failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/30 to-orange-600/20 border border-red-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold">DigiLocker</h1>
              <p className="text-gray-400 text-sm mt-0.5">Your secure personal document vault</p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onChangePin}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs text-gray-300 hover:text-white transition-all"
              title="Change PIN"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Change PIN
            </button>
            <button
              onClick={onLock}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all"
              title="Lock DigiLocker"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Lock
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Total Documents</p>
                <p className="text-2xl font-bold mt-1">{stats.count}</p>
              </div>
              <span className="text-3xl opacity-50">📄</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Storage Used</p>
                <p className="text-2xl font-bold mt-1">{formatFileSize(stats.totalSize)}</p>
              </div>
              <span className="text-3xl opacity-50">💾</span>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer ${isDragging ? "border-red-500/70 bg-red-500/5" : "border-gray-700 hover:border-gray-500 bg-gray-800/20 hover:bg-gray-800/40"}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
            {uploading ? (
              <>
                <div className="w-12 h-12 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
                <p className="text-white font-medium">Uploading...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{isDragging ? "Drop your file here" : "Drag & drop or click to upload"}</p>
                  <p className="text-gray-500 text-xs mt-1">PDF, JPG, PNG, DOC, XLS, TXT — max {MAX_SIZE_MB}MB</p>
                </div>
                <button className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold text-sm transition-all shadow-lg shadow-red-500/25 pointer-events-none">
                  Choose File
                </button>
              </>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Uploaded Documents
            <span className="ml-2 text-sm font-normal text-gray-500">({documents.length})</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-600/20 to-orange-600/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">No documents yet</p>
                <p className="text-gray-500 text-sm mt-1">Upload your first document above</p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden">
              <div className="divide-y divide-gray-700/40">
                {documents.map((doc) => {
                  const fileIcon = getFileIcon(doc.type);
                  return (
                    <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${fileIcon.color}`}>
                        <span className="text-[10px] font-bold tracking-wider">{fileIcon.label}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{doc.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{formatFileSize(doc.size)} · {formatDate(doc.uploadedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleView(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/50 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-700/40 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewingDoc(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0f1120] border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-white font-semibold truncate">{viewingDoc.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{formatFileSize(viewingDoc.size)} · Uploaded {formatDate(viewingDoc.uploadedAt)}</p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="ml-4 w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {viewingDoc.loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : viewingDoc.dataUrl && viewingDoc.type.startsWith("image/") ? (
                <div className="flex items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewingDoc.dataUrl} alt={viewingDoc.name} className="max-w-full max-h-[65vh] object-contain rounded-lg" />
                </div>
              ) : viewingDoc.dataUrl && viewingDoc.type === "application/pdf" ? (
                <iframe src={viewingDoc.dataUrl} className="w-full h-[65vh]" title={viewingDoc.name} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
                  <p className="text-white font-medium">Preview not available</p>
                  <p className="text-gray-500 text-sm">This file type cannot be previewed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 border text-white text-sm px-5 py-3 rounded-xl shadow-2xl ${toast.type === "error" ? "bg-red-950 border-red-700/60" : "bg-gray-800 border-gray-600/60"}`}>
          {toast.type === "error" ? (
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Root Component — orchestrates all screens ────────────────────────────────
export default function DigiLockerPage() {
  useSessionGuard(); // ← ADD line 5 — first line inside the function

  const [screen, setScreen] = useState<Screen>("loading");

  // On mount: check if user has a PIN set
  useEffect(() => {
    apiFetch("/api/digilocker/pin/status")
      .then((res) => setScreen(res.has_pin ? "enter_pin" : "create_pin"))
      .catch(() => setScreen("enter_pin")); // default to enter if API fails
  }, []);

  if (screen === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (screen === "create_pin") {
    return <CreatePinScreen onCreated={() => setScreen("vault")} />;
  }

  if (screen === "enter_pin") {
    return <EnterPinScreen onVerified={() => setScreen("vault")} />;
  }

  if (screen === "change_pin") {
    return <ChangePinScreen onDone={() => setScreen("vault")} />;
  }

  // screen === "vault"
  return (
    <VaultScreen
      onLock={() => setScreen("enter_pin")}
      onChangePin={() => setScreen("change_pin")}
    />
  );
}