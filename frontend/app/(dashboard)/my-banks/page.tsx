"use client";

import { useRouter } from "next/navigation";

export default function MyBanksPage() {
  const router = useRouter();

  const banks = [
    {
      id: "hdfc",
      name: "HDFC Bank",
      accountNumber: "XXXX 1234",
      balance: "₹4,25,000",
      gradient: "from-red-600/20 to-orange-600/20",
      border: "border-red-500/30",
      hoverBorder: "hover:border-red-500/60",
    },
    {
      id: "icici",
      name: "ICICI Bank",
      accountNumber: "XXXX 5678",
      balance: "₹5,80,340",
      gradient: "from-orange-600/20 to-amber-600/20",
      border: "border-orange-500/30",
      hoverBorder: "hover:border-orange-500/60",
    },
    {
      id: "sbi",
      name: "State Bank of India",
      accountNumber: "XXXX 9012",
      balance: "₹2,40,340",
      gradient: "from-blue-600/20 to-cyan-600/20",
      border: "border-blue-500/30",
      hoverBorder: "hover:border-blue-500/60",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">My Banks</h1>
          <p className="text-gray-400 text-lg">
            Select a bank to view details and transactions
          </p>
        </div>

        {/* Bank Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((bank) => (
            <div
              key={bank.id}
              onClick={() => router.push(`/my-banks/${bank.id}`)}
              className={`bg-gradient-to-br ${bank.gradient} border ${bank.border} ${bank.hoverBorder} rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-all cursor-pointer`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{bank.name}</h3>
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏦</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">Account Number</p>
                  <p className="font-mono text-lg tracking-wider">
                    {bank.accountNumber}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                  <p className="text-2xl font-bold">{bank.balance}</p>
                </div>
                <div className="pt-4">
                  <button className="w-full bg-white/10 hover:bg-white/20 rounded-lg py-2.5 text-sm font-medium transition-colors">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Quick Tip</h3>
              <p className="text-gray-400">
                Click on any bank card to view detailed account information,
                transaction history, and manage your account settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}