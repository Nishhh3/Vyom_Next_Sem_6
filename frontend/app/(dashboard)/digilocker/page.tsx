"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface DigiDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
}

const DB_NAME = "DigiLockerDB_Simple";
const DB_VERSION = 1;
const STORE_NAME = "documents";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(db: IDBDatabase): Promise<DigiDocument[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as DigiDocument[]);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db: IDBDatabase, doc: DigiDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

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

export default function DigiLockerPage() {
  const [documents, setDocuments] = useState<DigiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DigiDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    openDB()
      .then((database) => {
        setDb(database);
        return dbGetAll(database);
      })
      .then((docs) => {
        setDocuments(docs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!db) return;
      if (file.size > MAX_SIZE_BYTES) {
        showToast(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
        return;
      }

      setUploading(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const doc: DigiDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          dataUrl,
        };

        await dbPut(db, doc);
        const updated = await dbGetAll(db);
        setDocuments(updated);
        showToast(`"${file.name}" uploaded successfully`);
      } catch {
        showToast("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [db]
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

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="space-y-1">
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
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Total Documents</p>
                <p className="text-2xl font-bold mt-1">{documents.length}</p>
              </div>
              <span className="text-3xl opacity-50">📄</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Storage Used</p>
                <p className="text-2xl font-bold mt-1">
                  {formatFileSize(documents.reduce((s, d) => s + d.size, 0))}
                </p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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

                      {/* View Button */}
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 border border-gray-600/50 rounded-lg text-xs text-gray-300 hover:text-white transition-all flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
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
              {viewingDoc.type.startsWith("image/") ? (
                <div className="flex items-center justify-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingDoc.dataUrl}
                    alt={viewingDoc.name}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                </div>
              ) : viewingDoc.type === "application/pdf" ? (
                <iframe
                  src={viewingDoc.dataUrl}
                  className="w-full h-[65vh]"
                  title={viewingDoc.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 border border-gray-600/60 text-white text-sm px-5 py-3 rounded-xl shadow-2xl">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}