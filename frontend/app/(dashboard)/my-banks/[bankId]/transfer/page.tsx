"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function TransferPage() {
  const params = useParams();
  const router = useRouter();
  const bankId = params.bankId as string;

  const bankDetails: Record<string, any> = {
    hdfc: {
      name: "HDFC Bank",
      accountNumber: "XXXX XXXX XXXX 1234",
      balance: "₹4,25,000",
    },
    icici: {
      name: "ICICI Bank",
      accountNumber: "XXXX XXXX XXXX 5678",
      balance: "₹5,80,340",
    },
    sbi: {
      name: "State Bank of India",
      accountNumber: "XXXX XXXX XXXX 9012",
      balance: "₹2,40,340",
    },
  };

  const currentBank = bankDetails[bankId];

  const [formData, setFormData] = useState({
    toAccount: "",
    ifsc: "",
    amount: "",
    remark: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI only - no backend logic
    alert("Transfer Money feature - UI only (no backend connected)");
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
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
          <h1 className="text-3xl lg:text-4xl font-bold">Transfer Money</h1>
          <p className="text-gray-400 text-lg">
            Send money from {currentBank?.name || "your bank"}
          </p>
        </div>

        {/* From Account Card */}
        <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">From Account</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">{currentBank?.name}</p>
                <p className="font-mono text-gray-300">
                  {currentBank?.accountNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold">{currentBank?.balance}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-6">Transfer Details</h2>

            <div className="space-y-6">
              {/* To Account Number */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  To Account Number *
                </label>
                <input
                  type="text"
                  name="toAccount"
                  value={formData.toAccount}
                  onChange={handleChange}
                  placeholder="Enter beneficiary account number"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>

              {/* IFSC Code */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">IFSC Code *</label>
                <input
                  type="text"
                  name="ifsc"
                  value={formData.ifsc}
                  onChange={handleChange}
                  placeholder="Enter IFSC code"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors uppercase"
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                  min="1"
                  required
                />
              </div>

              {/* Remark */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Remark (Optional)
                </label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  placeholder="Add a note for this transfer"
                  rows={3}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-500/50"
          >
            Send Money
          </button>
        </form>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="text-3xl">ℹ️</div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Important Note</h3>
              <p className="text-gray-300 text-sm">
                This is a UI-only demo. No actual money transfer will occur. In
                production, this would connect to secure payment APIs with
                multi-factor authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}