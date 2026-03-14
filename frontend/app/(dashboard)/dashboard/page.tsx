"use client";

import { useSessionGuard } from "@/hooks/useSessionGuard";
import { useEffect, useState } from "react";
import {
  fetchAllAccounts,
  BankAccount,
  bankTheme,
  bankDisplayName,
  maskAccountNumber,
  formatINR,
} from "@/services/bankApi";

// ── Types ─────────────────────────────────────────────────────

interface RecentTx {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  bank: string;
}

// ── Component ─────────────────────────────────────────────────

export default function DashboardPage() {
  useSessionGuard();

  const [accounts, setAccounts]     = useState<BankAccount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    fetchAllAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ────────────────────────────────────────────
  const totalBalance    = accounts.reduce((sum, a) => sum + a.balance, 0);
  const connectedBanks  = new Set(accounts.map((a) => a.bank)).size;

  const stats = [
    {
      label: "Total Balance",
      value: loading ? "—" : formatINR(totalBalance),
      icon: "💰",
    },
    {
      label: "Connected Banks",
      value: loading ? "—" : String(connectedBanks),
      icon: "🏦",
    },
    {
      label: "Linked Accounts",
      value: loading ? "—" : String(accounts.length),
      icon: "📊",
    },
  ];

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">Welcome back</h1>
          <p className="text-gray-400 text-lg">Here&apos;s your account overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm hover:border-gray-600/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-2xl lg:text-3xl font-bold">{stat.value}</p>
                </div>
                <div className="text-4xl opacity-60">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
            ⚠️ {error === "No phone number linked to your account. Call POST /api/bank/link-phone first."
              ? "No phone linked yet — go to Settings to add your phone number."
              : error}
          </div>
        )}

        {/* Bank Overview */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Banks</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 animate-pulse h-48"
                />
              ))}
            </div>
          ) : accounts.length === 0 && !error ? (
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-8 text-center text-gray-400">
              No bank accounts found. Link your phone number in Settings to fetch your accounts.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {accounts.map((account) => {
                const theme = bankTheme(account.bank);
                return (
                  <div
                    key={account.account_id}
                    className={`bg-gradient-to-br ${theme.gradient} border ${theme.border} rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {bankDisplayName(account.bank)}
                        </h3>
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                          <span className="text-xl">🏦</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Account Number</p>
                        <p className="font-mono text-lg tracking-wider">
                          {maskAccountNumber(account.account_number)}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                        <p className="text-2xl font-bold">
                          {formatINR(account.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions — pulled from first available account */}
        <RecentTransactions accounts={accounts} loading={loading} />

      </div>
    </div>
  );
}

// ── Recent Transactions sub-component ─────────────────────────

function RecentTransactions({
  accounts,
  loading,
}: {
  accounts: BankAccount[];
  loading: boolean;
}) {
  const [txns, setTxns]       = useState<RecentTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (accounts.length === 0) return;

    // Fetch last 5 transactions from the first account
    const first = accounts[0];
    setTxLoading(true);

    import("@/services/bankApi").then(({ fetchTransactions }) => {
      fetchTransactions(first.bank, first.account_id, 5, 0)
        .then((data) => {
          setTxns(
            data.transactions.map((t) => ({
              date:        new Date(t.date).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              }),
              description: t.remarks ?? "Transaction",
              amount:      t.amount,
              type:        t.type === "CREDIT" ? "credit" : "debit",
              bank:        first.bank,
            }))
          );
        })
        .catch(() => {})
        .finally(() => setTxLoading(false));
    });
  }, [accounts]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recent Transactions</h2>
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading || txLoading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">
            Loading transactions...
          </div>
        ) : txns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No recent transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Date</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Description</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Bank</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((txn, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700/30 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6 text-gray-300 text-sm">{txn.date}</td>
                    <td className="py-4 px-6">{txn.description}</td>
                    <td className="py-4 px-6 text-gray-400 text-sm">{txn.bank}</td>
                    <td
                      className={`py-4 px-6 text-right font-semibold ${
                        txn.type === "credit" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {txn.type === "credit" ? "+" : "-"}
                      {formatINR(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}