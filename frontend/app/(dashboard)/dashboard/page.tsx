'use client'; // ← ADD line 1 (was missing)

import { useSessionGuard } from '@/hooks/useSessionGuard'; // ← ADD line 2

export default function DashboardPage() {
  useSessionGuard(); // ← ADD line 3

  const stats = [
    { label: "Total Balance", value: "₹12,45,680", icon: "💰" },
    { label: "Connected Banks", value: "3", icon: "🏦" },
    { label: "Monthly Spending", value: "₹87,450", icon: "📊" },
  ];

  const banks = [
    {
      name: "HDFC Bank",
      accountNumber: "XXXX 1234",
      balance: "₹4,25,000",
      gradient: "from-red-600/20 to-orange-600/20",
      border: "border-red-500/30",
    },
    {
      name: "ICICI Bank",
      accountNumber: "XXXX 5678",
      balance: "₹5,80,340",
      gradient: "from-orange-600/20 to-amber-600/20",
      border: "border-orange-500/30",
    },
    {
      name: "State Bank of India",
      accountNumber: "XXXX 9012",
      balance: "₹2,40,340",
      gradient: "from-blue-600/20 to-cyan-600/20",
      border: "border-blue-500/30",
    },
  ];

  const transactions = [
    { date: "Feb 05, 2026", description: "Grocery Store Payment", amount: -2450, type: "debit" },
    { date: "Feb 04, 2026", description: "Salary Credit", amount: 85000, type: "credit" },
    { date: "Feb 03, 2026", description: "Electricity Bill", amount: -1840, type: "debit" },
    { date: "Feb 02, 2026", description: "Online Transfer Received", amount: 5000, type: "credit" },
    { date: "Feb 01, 2026", description: "Restaurant Payment", amount: -3200, type: "debit" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
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

        {/* Bank Overview Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Banks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {banks.map((bank, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${bank.gradient} border ${bank.border} rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{bank.name}</h3>
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                      <span className="text-xl">🏦</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Account Number</p>
                    <p className="font-mono text-lg tracking-wider">{bank.accountNumber}</p>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                    <p className="text-2xl font-bold">{bank.balance}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Recent Transactions</h2>
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Date</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">Description</th>
                    <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-700/30 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6 text-gray-300">{txn.date}</td>
                      <td className="py-4 px-6">{txn.description}</td>
                      <td className={`py-4 px-6 text-right font-semibold ${txn.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                        {txn.type === "credit" ? "+" : ""}₹{Math.abs(txn.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}