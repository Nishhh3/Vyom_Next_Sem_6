"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchBalance,
  fetchTransactions,
  initiateTransfer,
  bankTheme,
  bankDisplayName,
  maskAccountNumberFull,
  formatINR,
  Transaction,
} from "@/services/bankApi";

type View = "overview" | "statement" | "transfer";

export default function BankDetailsPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const bank      = (params.bankId as string).toUpperCase(); // ICICI | SBI | HDFC
  const accountId = searchParams.get("account_id") ?? "";

  const theme = bankTheme(bank);

  // ── State ──────────────────────────────────────────────────
  const [view, setView]             = useState<View>("overview");
  const [balanceData, setBalanceData] = useState<any>(null);
  const [balLoading, setBalLoading] = useState(true);
  const [balError, setBalError]     = useState<string | null>(null);

  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [txTotal, setTxTotal]     = useState(0);
  const [txOffset, setTxOffset]   = useState(0);
  const [txLoading, setTxLoading] = useState(false);

  const [toAccount, setToAccount] = useState("");
  const [toIfsc, setToIfsc]       = useState("");
  const [amount, setAmount]       = useState("");
  const [remarks, setRemarks]     = useState("");
  const [sending, setSending]     = useState(false);
  const [txResult, setTxResult]   = useState<any>(null);
  const [txError, setTxError]     = useState<string | null>(null);

  // ── Load balance on mount ──────────────────────────────────
  useEffect(() => {
    if (!accountId) { router.push("/my-banks"); return; }
    setBalLoading(true);
    fetchBalance(bank, accountId)
      .then(setBalanceData)
      .catch((e) => setBalError(e.message))
      .finally(() => setBalLoading(false));
  }, [bank, accountId]);

  // ── Load transactions when Statement tab opens ─────────────
  useEffect(() => {
    if (view !== "statement" || !accountId) return;
    loadTxns(0);
  }, [view]);

  const loadTxns = (offset: number) => {
    setTxLoading(true);
    fetchTransactions(bank, accountId, 10, offset)
      .then((data) => {
        setTxns(offset === 0 ? data.transactions : [...txns, ...data.transactions]);
        setTxTotal(data.total);
        setTxOffset(offset + data.transactions.length);
      })
      .catch(() => {})
      .finally(() => setTxLoading(false));
  };

  // ── Transfer submit ────────────────────────────────────────
  const handleTransfer = async () => {
    if (!toAccount || !toIfsc || !amount) {
      setTxError("All fields are required.");
      return;
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setTxError("Enter a valid amount.");
      return;
    }
    setSending(true);
    setTxError(null);
    setTxResult(null);
    try {
      const result = await initiateTransfer(bank, accountId, {
        to_account_number: toAccount,
        to_ifsc:           toIfsc.toUpperCase(),
        amount:            Number(amount),
        remarks:           remarks || "Vyom Transfer",
      });
      setTxResult(result);
      // Refresh balance after transfer
      fetchBalance(bank, accountId).then(setBalanceData).catch(() => {});
      setToAccount(""); setToIfsc(""); setAmount(""); setRemarks("");
    } catch (e: any) {
      setTxError(e.message ?? "Transfer failed.");
    } finally {
      setSending(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const displayName = bankDisplayName(bank);
  const accNumber   = balanceData ? maskAccountNumberFull(balanceData.account_number) : "XXXX XXXX XXXX XXXX";
  const ifsc        = balanceData?.ifsc ?? "—";
  const accType     = balanceData?.account_type ?? "SAVINGS";
  const balance     = balanceData?.balance ?? 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Back */}
        <button
          onClick={() => router.push("/my-banks")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to My Banks</span>
        </button>

        {/* Bank Header Card */}
        <div className={`bg-gradient-to-br ${theme.gradient} border ${theme.border} rounded-2xl p-6 lg:p-8 backdrop-blur-sm`}>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">{displayName}</h1>
                <p className="text-gray-300 text-lg capitalize">
                  {accType.toLowerCase()} Account
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Account Number</p>
                  <p className="font-mono text-lg tracking-wider">{accNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">IFSC Code</p>
                  <p className="font-mono text-lg tracking-wider">{ifsc}</p>
                </div>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-4xl">🏦</span>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">Current Balance</p>
            {balLoading ? (
              <div className="h-12 w-48 mx-auto bg-gray-700/40 rounded-lg animate-pulse" />
            ) : balError ? (
              <p className="text-red-400 text-sm">{balError}</p>
            ) : (
              <p className="text-4xl lg:text-5xl font-bold">{formatINR(balance)}</p>
            )}
          </div>
        </div>

        {/* Action Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["overview", "statement", "transfer"] as View[]).map((v) => {
            const meta = {
              overview: { icon: "🏠", title: "Overview",       sub: "Account summary" },
              statement:{ icon: "📄", title: "View Statement", sub: "Transaction history" },
              transfer: { icon: "💸", title: "Transfer Money", sub: "Send to any account" },
            }[v];
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 border rounded-2xl p-8 backdrop-blur-sm transition-all group ${
                  view === v
                    ? "border-red-500/60 bg-red-500/5"
                    : "border-gray-700/50 hover:border-red-500/50"
                }`}
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                    <span className="text-4xl">{meta.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{meta.title}</h3>
                    <p className="text-sm text-gray-400">{meta.sub}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {view === "statement" && (
          <StatementView
            txns={txns}
            total={txTotal}
            offset={txOffset}
            loading={txLoading}
            onLoadMore={() => loadTxns(txOffset)}
          />
        )}

        {view === "transfer" && (
          <TransferView
            balance={balance}
            toAccount={toAccount}   setToAccount={setToAccount}
            toIfsc={toIfsc}         setToIfsc={setToIfsc}
            amount={amount}         setAmount={setAmount}
            remarks={remarks}       setRemarks={setRemarks}
            sending={sending}
            txResult={txResult}
            txError={txError}
            onSubmit={handleTransfer}
            onDismiss={() => setTxResult(null)}
          />
        )}
      </div>
    </div>
  );
}

// ── Statement sub-component ────────────────────────────────────

function StatementView({
  txns, total, offset, loading, onLoadMore,
}: {
  txns: Transaction[];
  total: number;
  offset: number;
  loading: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Transaction History</h2>
        <span className="text-gray-400 text-sm">{txns.length} of {total}</span>
      </div>
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading && txns.length === 0 ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Loading transactions...</div>
        ) : txns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Date</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Remarks</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Ref No.</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">Amount</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">Balance</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-gray-700/30 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-gray-300 text-sm">
                      {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-4 px-6 text-sm">{t.remarks}</td>
                    <td className="py-4 px-6 text-gray-500 text-xs font-mono">{t.ref_number}</td>
                    <td className={`py-4 px-6 text-right font-semibold ${t.type === "CREDIT" ? "text-green-400" : "text-red-400"}`}>
                      {t.type === "CREDIT" ? "+" : "-"}{formatINR(t.amount)}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-400 text-sm">
                      {formatINR(t.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {offset < total && (
          <div className="p-4 border-t border-gray-700/50 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Transfer sub-component ─────────────────────────────────────

function TransferView({
  balance, toAccount, setToAccount, toIfsc, setToIfsc,
  amount, setAmount, remarks, setRemarks,
  sending, txResult, txError, onSubmit, onDismiss,
}: any) {
  return (
    <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 lg:p-8 backdrop-blur-sm space-y-6">
      <h2 className="text-xl font-bold">Transfer Money</h2>

      {/* Success receipt */}
      {txResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-green-400 font-semibold">✅ Transfer Successful</p>
            <button onClick={onDismiss} className="text-gray-500 hover:text-white text-sm">Dismiss</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold text-white">{formatINR(txResult.amount)}</span>
            <span className="text-gray-500">UTR / Ref</span>
            <span className="font-mono text-xs">{txResult.ref_number}</span>
            <span className="text-gray-500">Balance after</span>
            <span>{formatINR(txResult.balance_after)}</span>
            <span className="text-gray-500">To account</span>
            <span className="font-mono text-xs">{txResult.to_account}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Beneficiary Account Number</label>
          <input
            type="text"
            value={toAccount}
            onChange={(e) => setToAccount(e.target.value)}
            placeholder="Account number"
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 text-sm font-mono"
          />
        </div>
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">IFSC Code</label>
          <input
            type="text"
            value={toIfsc}
            onChange={(e) => setToIfsc(e.target.value.toUpperCase())}
            placeholder="HDFC0001234"
            maxLength={11}
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 text-sm font-mono uppercase"
          />
        </div>
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min={1}
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 text-sm"
          />
          <p className="text-gray-600 text-xs">
            Available: {formatINR(balance)}
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Remarks (optional)</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Rent payment"
            maxLength={100}
            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 text-sm"
          />
        </div>
      </div>

      {txError && (
        <p className="text-red-400 text-sm">⚠️ {txError}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={sending || !toAccount || !toIfsc || !amount}
        className="w-full md:w-auto bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-medium transition-colors"
      >
        {sending ? "Processing..." : "Send Money →"}
      </button>
    </div>
  );
}