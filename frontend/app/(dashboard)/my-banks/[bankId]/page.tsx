"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BankDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.bankId as string;

  const [bankData, setBankData] = useState<any>(null);

  const banksData: Record<string, any> = {
    hdfc: {
      name: "HDFC Bank",
      accountNumber: "XXXX XXXX XXXX 1234",
      ifsc: "HDFC0001234",
      accountType: "Savings Account",
      currentBalance: "₹4,25,000",
      availableBalance: "₹4,20,000",
      gradient: "from-red-600/20 to-orange-600/20",
      border: "border-red-500/30",
    },
    icici: {
      name: "ICICI Bank",
      accountNumber: "XXXX XXXX XXXX 5678",
      ifsc: "ICIC0005678",
      accountType: "Savings Account",
      currentBalance: "₹5,80,340",
      availableBalance: "₹5,75,340",
      gradient: "from-orange-600/20 to-amber-600/20",
      border: "border-orange-500/30",
    },
    sbi: {
      name: "State Bank of India",
      accountNumber: "XXXX XXXX XXXX 9012",
      ifsc: "SBIN0009012",
      accountType: "Savings Account",
      currentBalance: "₹2,40,340",
      availableBalance: "₹2,38,340",
      gradient: "from-blue-600/20 to-cyan-600/20",
      border: "border-blue-500/30",
    },
  };

  useEffect(() => {
    if (banksData[bankId]) {
      setBankData(banksData[bankId]);
    } else {
      router.push("/my-banks");
    }
  }, [bankId, router]);

  if (!bankData) {
    return (
      <div className="min-h-screen bg-[#0a0b14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading bank details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/my-banks")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to My Banks</span>
        </button>

        {/* Bank Header */}
        <div
          className={`bg-gradient-to-br ${bankData.gradient} border ${bankData.border} rounded-2xl p-6 lg:p-8 backdrop-blur-sm`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  {bankData.name}
                </h1>
                <p className="text-gray-300 text-lg">{bankData.accountType}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Account Number</p>
                  <p className="font-mono text-lg tracking-wider">
                    {bankData.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">IFSC Code</p>
                  <p className="font-mono text-lg tracking-wider">
                    {bankData.ifsc}
                  </p>
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
            <p className="text-4xl lg:text-5xl font-bold">
              {bankData.currentBalance}
            </p>
            <p className="text-gray-500 text-sm">
              Available: {bankData.availableBalance}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => router.push(`/my-banks/${bankId}/transfer`)}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 hover:border-red-500/50 rounded-2xl p-8 backdrop-blur-sm transition-all group"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <span className="text-4xl">💸</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Transfer Money</h3>
                <p className="text-sm text-gray-400">
                  Send money to any account
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push(`/my-banks/${bankId}/statement`)}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 hover:border-red-500/50 rounded-2xl p-8 backdrop-blur-sm transition-all group"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <span className="text-4xl">📄</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">View Statement</h3>
                <p className="text-sm text-gray-400">
                  Check transaction history
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push(`/my-banks/${bankId}/statement`)}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 hover:border-red-500/50 rounded-2xl p-8 backdrop-blur-sm transition-all group"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                <span className="text-4xl">⬇️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Download Statement</h3>
                <p className="text-sm text-gray-400">Get PDF statement</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}