// File: app/(dashboard)/my-banks/[bankId]/page.tsx

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
      transactions: [
        {
          date: "Feb 05, 2026",
          description: "UPI Payment to Amazon",
          amount: -1299,
          type: "debit",
        },
        {
          date: "Feb 04, 2026",
          description: "Salary Credited",
          amount: 85000,
          type: "credit",
        },
        {
          date: "Feb 03, 2026",
          description: "ATM Withdrawal",
          amount: -5000,
          type: "debit",
        },
        {
          date: "Feb 02, 2026",
          description: "Google Pay Received",
          amount: 2500,
          type: "credit",
        },
        {
          date: "Feb 01, 2026",
          description: "Netflix Subscription",
          amount: -649,
          type: "debit",
        },
        {
          date: "Jan 31, 2026",
          description: "Swiggy Order",
          amount: -850,
          type: "debit",
        },
      ],
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
      transactions: [
        {
          date: "Feb 05, 2026",
          description: "Electricity Bill Payment",
          amount: -1840,
          type: "debit",
        },
        {
          date: "Feb 04, 2026",
          description: "Freelance Payment Received",
          amount: 45000,
          type: "credit",
        },
        {
          date: "Feb 03, 2026",
          description: "Grocery Store",
          amount: -3200,
          type: "debit",
        },
        {
          date: "Feb 02, 2026",
          description: "PhonePe Cashback",
          amount: 150,
          type: "credit",
        },
        {
          date: "Feb 01, 2026",
          description: "Fuel Payment",
          amount: -2500,
          type: "debit",
        },
        {
          date: "Jan 31, 2026",
          description: "Online Shopping",
          amount: -4999,
          type: "debit",
        },
      ],
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
      transactions: [
        {
          date: "Feb 05, 2026",
          description: "Credit Card Bill Payment",
          amount: -8500,
          type: "debit",
        },
        {
          date: "Feb 04, 2026",
          description: "Interest Credited",
          amount: 340,
          type: "credit",
        },
        {
          date: "Feb 03, 2026",
          description: "Restaurant Payment",
          amount: -1850,
          type: "debit",
        },
        {
          date: "Feb 02, 2026",
          description: "Rent Received",
          amount: 15000,
          type: "credit",
        },
        {
          date: "Feb 01, 2026",
          description: "Mobile Recharge",
          amount: -599,
          type: "debit",
        },
        {
          date: "Jan 31, 2026",
          description: "Medicine Purchase",
          amount: -1250,
          type: "debit",
        },
      ],
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

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Current Balance</p>
              <p className="text-3xl lg:text-4xl font-bold">
                {bankData.currentBalance}
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className="text-3xl lg:text-4xl font-bold">
                {bankData.availableBalance}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Recent Transactions</h2>
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">
                      Date
                    </th>
                    <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">
                      Description
                    </th>
                    <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bankData.transactions.map((txn: any, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-gray-700/30 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6 text-gray-300">{txn.date}</td>
                      <td className="py-4 px-6">{txn.description}</td>
                      <td
                        className={`py-4 px-6 text-right font-semibold ${
                          txn.type === "credit"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {txn.type === "credit" ? "+" : ""}₹
                        {Math.abs(txn.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all">
            <div className="text-center space-y-2">
              <div className="text-3xl">💸</div>
              <p className="font-medium">Transfer Money</p>
            </div>
          </button>
          <button className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all">
            <div className="text-center space-y-2">
              <div className="text-3xl">📄</div>
              <p className="font-medium">View Statement</p>
            </div>
          </button>
          <button className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all">
            <div className="text-center space-y-2">
              <div className="text-3xl">⚙️</div>
              <p className="font-medium">Account Settings</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}