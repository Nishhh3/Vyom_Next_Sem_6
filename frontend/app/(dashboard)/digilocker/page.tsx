"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

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

// ─── Config ───────────────────────────────────────────────────────────────────
// Same port as your existing backend (8000). DigiLocker is mounted there now.
const API_BASE = "http://localhost:8000";
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ─── Auth headers ─────────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  // Picks up the JWT your existing login flow stores in localStorage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  if (token) return { Authorization: `Bearer ${token}` };

  // ⚠️  Dev-only fallback — remove before deploying to production
  return { "X-User-Email": "dev@example.com" };
}

// ─── Generic API fetch ────────────────────────────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
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
    day: "2-digit",
    month: "short",
    year: "numeric",
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function DigiLockerPage() {
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

  // ── Fetch document list + stats ────────────────────────────────────────────
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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE_BYTES) {
        showToast(`File too large. Max size is ${MAX_SIZE_MB}MB.`, "error");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/api/digilocker/upload`, {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(), // NOTE: do NOT set Content-Type — browser sets multipart boundary
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(err.detail ?? `HTTP ${res.status}`);
        }

        await fetchDocuments();
        showToast(`"${file.name}" uploaded successfully`);
      } catch (e: any) {
        showToast(e.message ?? "Upload failed", "error");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [fetchDocuments]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // ── View (load base64 data URL from backend) ───────────────────────────────
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

  // ── Delete ─────────────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/30 to-orange-600/20 border border-red-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">DigiLocker</h1>
            <p className="text-gray-400 text-sm mt-0.5">Your secure personal document vault</p>
          </div>
        </div>

        {/* ── Stats ── */}
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

        {/* ── Upload Area ── */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
            isDragging
              ? "border-red-500/70 bg-red-500/5"
              : "border-gray-700 hover:border-gray-500 bg-gray-800/20 hover:bg-gray-800/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileInput}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">
                    {isDragging ? "Drop your file here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    PDF, JPG, PNG, DOC, XLS, TXT — max {MAX_SIZE_MB}MB
                  </p>
                </div>
                <button className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold text-sm transition-all shadow-lg shadow-red-500/25 pointer-events-none">
                  Choose File
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Document List ── */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
                    >
                      {/* File Type Badge */}
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${fileIcon.color}`}>
                        <span className="text-[10px] font-bold tracking-wider">{fileIcon.label}</span>
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{doc.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {formatFileSize(doc.size)} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleView(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/50 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>

                        <button
                          onClick={() => handleDelete(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-700/40 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* ── Viewer Modal ── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingDoc(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0f1120] border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-white font-semibold truncate">{viewingDoc.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  {formatFileSize(viewingDoc.size)} · Uploaded {formatDate(viewingDoc.uploadedAt)}
                </p>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="ml-4 w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              {viewingDoc.loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : viewingDoc.dataUrl && viewingDoc.type.startsWith("image/") ? (
                <div className="flex items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingDoc.dataUrl}
                    alt={viewingDoc.name}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                </div>
              ) : viewingDoc.dataUrl && viewingDoc.type === "application/pdf" ? (
                <iframe
                  src={viewingDoc.dataUrl}
                  className="w-full h-[65vh]"
                  title={viewingDoc.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Preview not available</p>
                    <p className="text-gray-500 text-sm mt-1">This file type cannot be previewed</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 border text-white text-sm px-5 py-3 rounded-xl shadow-2xl ${
          toast.type === "error"
            ? "bg-red-950 border-red-700/60"
            : "bg-gray-800 border-gray-600/60"
        }`}>
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