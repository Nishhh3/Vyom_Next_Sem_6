"use client";

import { useState } from "react";

interface LoanFormData {
  age: number;
  employment_type: string;
  monthly_income: number;
  credit_score: number;
  savings: number;
  existing_loan: string;
  loan_purpose: string;
  requested_amount: number;
  tenure_years: number;
  collateral: string;
}

interface LoanFormProps {
  onSubmit: (data: LoanFormData) => void;
}

export default function LoanForm({ onSubmit }: LoanFormProps) {
  const [formData, setFormData] = useState<LoanFormData>({
    age: 30,
    employment_type: "Salaried",
    monthly_income: 50000,
    credit_score: 750,
    savings: 200000,
    existing_loan: "No",
    loan_purpose: "",
    requested_amount: 500000,
    tenure_years: 5,
    collateral: "No",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: [
        "age",
        "monthly_income",
        "credit_score",
        "savings",
        "requested_amount",
        "tenure_years",
      ].includes(name)
        ? Number(value)
        : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Section */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-6">Personal Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Age */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Age *</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              min="18"
              max="100"
              required
            />
          </div>

          {/* Employment Type - Radio */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Employment Type *</label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="employment_type"
                  value="Salaried"
                  checked={formData.employment_type === "Salaried"}
                  onChange={handleChange}
                  className="w-4 h-4 text-red-500 focus:ring-red-500 focus:ring-offset-0 bg-gray-900 border-gray-700"
                  required
                />
                <span className="text-sm text-white">Salaried</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="employment_type"
                  value="Unsalaried"
                  checked={formData.employment_type === "Unsalaried"}
                  onChange={handleChange}
                  className="w-4 h-4 text-red-500 focus:ring-red-500 focus:ring-offset-0 bg-gray-900 border-gray-700"
                />
                <span className="text-sm text-white">Unsalaried</span>
              </label>
            </div>
          </div>

          {/* Monthly Income */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Monthly Income (₹) *</label>
            <input
              type="number"
              name="monthly_income"
              value={formData.monthly_income}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              min="0"
              step="1000"
              required
            />
          </div>

          {/* Credit Score */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Credit Score *</label>
            <input
              type="number"
              name="credit_score"
              value={formData.credit_score}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              min="300"
              max="900"
              required
            />
          </div>

          {/* Savings */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Savings (₹) *</label>
            <input
              type="number"
              name="savings"
              value={formData.savings}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              min="0"
              step="10000"
              required
            />
          </div>

          {/* Existing Loan */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Existing Loan *</label>
            <select
              name="existing_loan"
              value={formData.existing_loan}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              required
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loan Details Section */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-6">Loan Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Loan Purpose */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-gray-400">Loan Purpose *</label>
            <input
              type="text"
              name="loan_purpose"
              value={formData.loan_purpose}
              onChange={handleChange}
              placeholder="e.g., new house, education, business expansion"
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              required
            />
          </div>

          {/* Requested Amount */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">
              Requested Loan Amount (₹) *
            </label>
            <input
              type="number"
              name="requested_amount"
              value={formData.requested_amount}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              min="10000"
              step="10000"
              required
            />
          </div>

          {/* Tenure - Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-400">Tenure (Years) *</label>
              <span className="text-white font-semibold">
                {formData.tenure_years} {formData.tenure_years === 1 ? "year" : "years"}
              </span>
            </div>
            <input
              type="range"
              name="tenure_years"
              value={formData.tenure_years}
              onChange={handleChange}
              min="1"
              max="10"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 year</span>
              <span>10 years</span>
            </div>
          </div>

          {/* Collateral */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Collateral Available *</label>
            <select
              name="collateral"
              value={formData.collateral}
              onChange={handleChange}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              required
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-500/50"
      >
        Get Loan Recommendation
      </button>
    </form>
  );
}