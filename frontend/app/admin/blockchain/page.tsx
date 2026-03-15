"use client";

import { useEffect, useState, useCallback } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Types ─────────────────────────────────────────────────────
interface ChainStatus {
  chain_locked: boolean;
  unresolved_alerts: number;
  total_blocks: number;
}

interface VerifyResult {
  valid: boolean;
  total_blocks: number;
  broken_at_block?: number;
  tampered_block?: any;
  message: string;
  chain_locked?: boolean;
  last_hash?: string;
}

interface Block {
  block_number: number;
  block_hash: string;
  prev_hash: string;
  vyom_user_id: string;
  from_bank: string;
  from_account: string;
  to_account: string;
  to_ifsc: string;
  amount: number;
  ref_number: string;
  remarks: string;
  credited_bank: string;
  status: string;
  created_at: string;
}

interface Alert {
  id: number;
  alert_type: string;
  block_number?: number;
  expected_hash?: string;
  found_hash?: string;
  message: string;
  resolved: boolean;
  created_at: string;
}

// ── Helper components ─────────────────────────────────────────
function StatusBadge({ valid }: { valid: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      valid
        ? "bg-green-500/10 text-green-400 border-green-500/30"
        : "bg-red-500/10 text-red-400 border-red-500/30"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${valid ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
      {valid ? "Intact" : "Compromised"}
    </span>
  );
}

function AlertTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    HASH_MISMATCH:  "bg-red-500/10 text-red-400 border-red-500/30",
    CHAIN_BREAK:    "bg-red-500/10 text-red-400 border-red-500/30",
    AUTO_LOCK:      "bg-orange-500/10 text-orange-400 border-orange-500/30",
    WRITE_BLOCKED:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${map[type] ?? "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
      {type.replace("_", " ")}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BlockchainPage() {
  const [status, setStatus]           = useState<ChainStatus | null>(null);
  const [verifyResult, setVerify]     = useState<VerifyResult | null>(null);
  const [blocks, setBlocks]           = useState<Block[]>([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [alerts, setAlerts]           = useState<Alert[]>([]);
  const [offset, setOffset]           = useState(0);

  const [loadingStatus,  setLoadingStatus]  = useState(true);
  const [loadingVerify,  setLoadingVerify]  = useState(false);
  const [loadingBlocks,  setLoadingBlocks]  = useState(true);
  const [loadingAlerts,  setLoadingAlerts]  = useState(true);
  const [lockingChain,   setLockingChain]   = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ── Fetch status ────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const r = await fetch(`${BASE}/api/blockchain/status`, { headers: authHeaders() });
      const d = await r.json();
      setStatus(d);
    } catch (e: any) { setError(e.message); }
    finally { setLoadingStatus(false); }
  }, []);

  // ── Fetch blocks ────────────────────────────────────────────
  const fetchBlocks = useCallback(async (off = 0) => {
    setLoadingBlocks(true);
    try {
      const r = await fetch(`${BASE}/api/blockchain/blocks?limit=10&offset=${off}`, { headers: authHeaders() });
      const d = await r.json();
      setBlocks(off === 0 ? d.blocks : (prev) => [...prev, ...d.blocks]);
      setTotalBlocks(d.total);
      setOffset(off + d.blocks.length);
    } catch {}
    finally { setLoadingBlocks(false); }
  }, []);

  // ── Fetch alerts ────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const r = await fetch(`${BASE}/api/blockchain/alerts`, { headers: authHeaders() });
      const d = await r.json();
      setAlerts(d.alerts ?? []);
    } catch {}
    finally { setLoadingAlerts(false); }
  }, []);

  // ── Verify chain ────────────────────────────────────────────
  const runVerify = async () => {
    setLoadingVerify(true);
    try {
      const r = await fetch(`${BASE}/api/blockchain/verify`, { headers: authHeaders() });
      const d = await r.json();
      setVerify(d);
      fetchStatus();
      fetchAlerts();
    } catch (e: any) { setError(e.message); }
    finally { setLoadingVerify(false); }
  };

  // ── Toggle lock ─────────────────────────────────────────────
  const toggleLock = async () => {
    if (!status) return;
    const newLocked = !status.chain_locked;
    const confirm = window.confirm(
      newLocked
        ? "🔒 Lock the chain? No new transactions will be recorded until unlocked."
        : "🔓 Unlock the chain? New transactions will resume being recorded."
    );
    if (!confirm) return;
    setLockingChain(true);
    try {
      const r = await fetch(`${BASE}/api/blockchain/lock`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ locked: newLocked }),
      });
      const d = await r.json();
      if (r.ok) fetchStatus();
      else setError(d.detail ?? "Failed to toggle lock");
    } catch (e: any) { setError(e.message); }
    finally { setLockingChain(false); }
  };

  // ── Resolve alert ───────────────────────────────────────────
  const resolveAlert = async (id: number) => {
    try {
      await fetch(`${BASE}/api/blockchain/alerts/${id}/resolve`, {
        method: "POST", headers: authHeaders(),
      });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    fetchBlocks(0);
    fetchAlerts();
  }, []);

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Blockchain Ledger</h1>
          <p className="text-gray-400">Immutable transaction audit trail — SHA-256 cryptographic chain</p>
        </div>
        <button
          onClick={runVerify}
          disabled={loadingVerify}
          className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loadingVerify ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
          {loadingVerify ? "Verifying..." : "Verify Chain"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Chain Status",
            value: loadingStatus ? "—" : (status?.chain_locked ? "Locked" : "Active"),
            icon: "⛓️",
            color: status?.chain_locked ? "text-red-400" : "text-green-400",
          },
          {
            label: "Total Blocks",
            value: loadingStatus ? "—" : String(status?.total_blocks ?? 0),
            icon: "📦",
            color: "text-white",
          },
          {
            label: "Unresolved Alerts",
            value: loadingStatus ? "—" : String(status?.unresolved_alerts ?? 0),
            icon: "🚨",
            color: (status?.unresolved_alerts ?? 0) > 0 ? "text-red-400" : "text-green-400",
          },
          {
            label: "Last Verified",
            value: verifyResult ? (verifyResult.valid ? "✅ Intact" : "❌ Broken") : "Not yet run",
            icon: "🔍",
            color: verifyResult ? (verifyResult.valid ? "text-green-400" : "text-red-400") : "text-gray-400",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">{s.label}</p>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Verify result banner */}
      {verifyResult && (
        <div className={`border rounded-xl p-5 space-y-3 ${
          verifyResult.valid
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <p className={`font-semibold text-lg ${verifyResult.valid ? "text-green-400" : "text-red-400"}`}>
              {verifyResult.message}
            </p>
            <StatusBadge valid={verifyResult.valid} />
          </div>
          {!verifyResult.valid && verifyResult.tampered_block && (
            <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
              <p className="text-red-300 font-medium">🔍 Tampered Block Details</p>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <span className="text-gray-500">Block number</span>
                <span className="font-mono">#{verifyResult.broken_at_block}</span>
                <span className="text-gray-500">Issue</span>
                <span className="text-red-300">{verifyResult.tampered_block.issue}</span>
                {verifyResult.tampered_block.expected_hash && (
                  <>
                    <span className="text-gray-500">Expected hash</span>
                    <span className="font-mono text-xs text-green-300">{verifyResult.tampered_block.expected_hash?.slice(0, 32)}...</span>
                    <span className="text-gray-500">Found hash</span>
                    <span className="font-mono text-xs text-red-300">{verifyResult.tampered_block.block_hash?.slice(0, 32)}...</span>
                  </>
                )}
                <span className="text-gray-500">Transaction</span>
                <span>{verifyResult.tampered_block.from_account} → {verifyResult.tampered_block.to_account}</span>
                <span className="text-gray-500">Amount</span>
                <span>₹{verifyResult.tampered_block.amount}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chain lock toggle */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-white font-semibold">Chain Lock</p>
          <p className="text-gray-400 text-sm">
            {status?.chain_locked
              ? "Chain is locked — no new transaction blocks will be written until unlocked."
              : "Chain is active — new transaction blocks are being recorded normally."}
          </p>
        </div>
        <button
          onClick={toggleLock}
          disabled={lockingChain || loadingStatus}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            status?.chain_locked
              ? "bg-green-600/80 hover:bg-green-600"
              : "bg-red-600/80 hover:bg-red-600"
          }`}
        >
          {lockingChain ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{status?.chain_locked ? "🔓" : "🔒"}</span>
          )}
          {status?.chain_locked ? "Unlock Chain" : "Lock Chain"}
        </button>
      </div>

      {/* Unresolved alerts */}
      {unresolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            🚨 Active Alerts
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full">
              {unresolvedAlerts.length}
            </span>
          </h2>
          <div className="space-y-2">
            {unresolvedAlerts.map((alert) => (
              <div key={alert.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTypeBadge type={alert.alert_type} />
                    {alert.block_number && (
                      <span className="text-gray-500 text-xs">Block #{alert.block_number}</span>
                    )}
                    <span className="text-gray-600 text-xs ml-auto">
                      {new Date(alert.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{alert.message}</p>
                  {alert.expected_hash && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                      <span className="text-gray-500">Expected</span>
                      <span className="font-mono text-green-400">{alert.expected_hash?.slice(0, 24)}...</span>
                      <span className="text-gray-500">Found</span>
                      <span className="font-mono text-red-400">{alert.found_hash?.slice(0, 24)}...</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Transaction Blocks</h2>
          <span className="text-gray-400 text-sm">{blocks.length} of {totalBlocks}</span>
        </div>

        {loadingBlocks && blocks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400 animate-pulse">
            Loading blocks...
          </div>
        ) : blocks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
            No transaction blocks yet. Blocks are created when transfers are made.
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Block", "From", "To", "Amount", "Bank", "Ref No.", "Hash", "Time"].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => (
                    <tr key={block.block_number} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono text-gray-300">
                          #{block.block_number}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs">
                          <p className="text-gray-300 font-mono">{block.from_account.slice(-8)}</p>
                          <p className="text-gray-500">{block.from_bank}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs">
                          <p className="text-gray-300 font-mono">{block.to_account.slice(-8)}</p>
                          <p className="text-gray-500">{block.to_ifsc}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-semibold text-sm">
                        ₹{block.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                          block.from_bank === "HDFC"  ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          block.from_bank === "ICICI" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {block.from_bank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-400">
                        {block.ref_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">
                        {block.block_hash.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {new Date(block.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {blocks.length < totalBlocks && (
              <div className="p-4 border-t border-white/10 text-center">
                <button
                  onClick={() => fetchBlocks(offset)}
                  disabled={loadingBlocks}
                  className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {loadingBlocks ? "Loading..." : "Load more →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}