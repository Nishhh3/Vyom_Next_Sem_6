"use client";

import { useParams, useRouter } from "next/navigation";

export default function StatementPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.bankId as string;

  const bankNames: Record<string, string> = {
    hdfc: "HDFC Bank",
    icici: "ICICI Bank",
    sbi: "State Bank of India",
  };

  const transactions = [
    {
      date: "Feb 13, 2026",
      description: "Salary Credit - January 2026",
      debit: null,
      credit: 85000,
      balance: 425000,
    },
    {
      date: "Feb 12, 2026",
      description: "Netflix Subscription",
      debit: 649,
      credit: null,
      balance: 340000,
    },
    {
      date: "Feb 11, 2026",
      description: "UPI Payment to Amazon",
      debit: 2499,
      credit: null,
      balance: 340649,
    },
    {
      date: "Feb 10, 2026",
      description: "ATM Withdrawal",
      debit: 5000,
      credit: null,
      balance: 343148,
    },
    {
      date: "Feb 09, 2026",
      description: "Google Pay Received",
      debit: null,
      credit: 2500,
      balance: 348148,
    },
    {
      date: "Feb 08, 2026",
      description: "Electricity Bill Payment",
      debit: 1840,
      credit: null,
      balance: 345648,
    },
    {
      date: "Feb 07, 2026",
      description: "Interest Credited",
      debit: null,
      credit: 340,
      balance: 347488,
    },
    {
      date: "Feb 06, 2026",
      description: "Grocery Store Payment",
      debit: 3200,
      credit: null,
      balance: 347148,
    },
    {
      date: "Feb 05, 2026",
      description: "Swiggy Food Order",
      debit: 850,
      credit: null,
      balance: 350348,
    },
    {
      date: "Feb 04, 2026",
      description: "Freelance Payment",
      debit: null,
      credit: 25000,
      balance: 351198,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/my-banks/${bankId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Bank Details</span>
        </button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">Bank Statement</h1>
          <p className="text-gray-400 text-lg">
            {bankNames[bankId] || "Bank"} - Transaction History
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap gap-4">
          <button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-red-500/50 flex items-center gap-2">
            <span>📄</span>
            <span>Download PDF</span>
          </button>
          <button className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2">
            <span>📊</span>
            <span>Download CSV</span>
          </button>
        </div>

        {/* Transactions Table */}
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">
                    Date
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm">
                    Description
                  </th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">
                    Debit
                  </th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">
                    Credit
                  </th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm">
                    Balance
                  </th>
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
                    <td className="py-4 px-6 text-right font-semibold text-red-400">
                      {txn.debit ? `₹${txn.debit.toLocaleString()}` : "-"}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-green-400">
                      {txn.credit ? `₹${txn.credit.toLocaleString()}` : "-"}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-white">
                      ₹{txn.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-2">Total Debit</p>
            <p className="text-2xl font-bold text-red-400">
              ₹
              {transactions
                .reduce((sum, txn) => sum + (txn.debit || 0), 0)
                .toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-2">Total Credit</p>
            <p className="text-2xl font-bold text-green-400">
              ₹
              {transactions
                .reduce((sum, txn) => sum + (txn.credit || 0), 0)
                .toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-gray-400 text-sm mb-2">Current Balance</p>
            <p className="text-2xl font-bold text-white">
              ₹{transactions[0].balance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}