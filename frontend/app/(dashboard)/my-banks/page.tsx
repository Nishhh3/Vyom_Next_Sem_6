"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchAllAccounts,
  BankAccount,
  bankTheme,
  bankDisplayName,
  maskAccountNumber,
  formatINR,
} from "@/services/bankApi";

export default function MyBanksPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadAccounts = () => {
    setLoading(true);
    setError(null);
    fetchAllAccounts()
      .then(setAccounts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const goToDetails = (account: BankAccount) => {
    router.push(
      `/my-banks/${account.bank.toLowerCase()}?account_id=${account.account_id}`
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">My Banks</h1>
          <p className="text-gray-400 text-lg">
            Select a bank to view details and manage your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={loadAccounts} className="ml-4 underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* Bank Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 animate-pulse h-64"
              />
            ))}
          </div>
        ) : accounts.length === 0 && !error ? (
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-12 text-center space-y-4">
            <div className="text-5xl">🏦</div>
            <p className="text-gray-300 text-lg font-medium">No bank accounts found</p>
            <p className="text-gray-500 text-sm">
              No accounts are linked to your registered phone number across ICICI, SBI, or HDFC.
            </p>
            <button
              onClick={loadAccounts}
              className="mt-4 bg-red-600/80 hover:bg-red-600 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => {
              const theme = bankTheme(account.bank);
              return (
                <div
                  key={account.account_id}
                  className={`bg-gradient-to-br ${theme.gradient} border ${theme.border} ${theme.hoverBorder} rounded-2xl p-6 backdrop-blur-sm transition-all`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">
                        {bankDisplayName(account.bank)}
                      </h3>
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🏦</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-400 text-sm">Account Number</p>
                      <p className="font-mono text-lg tracking-wider">
                        {maskAccountNumber(account.account_number)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-gray-400 text-sm">Account Type</p>
                      <p className="text-sm font-medium capitalize">
                        {account.account_type.toLowerCase()} Account
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                      <p className="text-2xl font-bold">
                        {formatINR(account.balance)}
                      </p>
                    </div>

                    <button
                      onClick={() => goToDetails(account)}
                      className="w-full bg-white/10 hover:bg-white/20 rounded-lg py-2.5 text-sm font-medium transition-colors"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}