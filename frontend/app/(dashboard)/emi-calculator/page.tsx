// File: app/(dashboard)/emi-calculator/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";

interface LoanConfig {
  interestRate: number;
  processingFee: number;
}

interface AmortizationRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

const loanConfigs: Record<string, LoanConfig> = {
  home: { interestRate: 8.5, processingFee: 0.5 },
  car: { interestRate: 9.5, processingFee: 1.0 },
  personal: { interestRate: 13.5, processingFee: 2.0 },
};

export default function EMICalculatorPage() {
  // Input States
  const [loanType, setLoanType] = useState<string>("home");
  const [loanAmount, setLoanAmount] = useState<number>(2500000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenure, setTenure] = useState<number>(20);
  const [includeProcessingFee, setIncludeProcessingFee] = useState<boolean>(true);
  const [enablePrepayment, setEnablePrepayment] = useState<boolean>(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(100000);
  const [prepaymentMonth, setPrepaymentMonth] = useState<number>(12);

  // Update interest rate when loan type changes
  useEffect(() => {
    setInterestRate(loanConfigs[loanType].interestRate);
  }, [loanType]);

  // EMI Calculations
  const calculations = useMemo(() => {
    const principal = loanAmount;
    const monthlyRate = interestRate / (12 * 100);
    const totalMonths = tenure * 12;

    // Calculate EMI
    let emi = 0;
    if (monthlyRate === 0) {
      emi = principal / totalMonths;
    } else {
      const powerTerm = Math.pow(1 + monthlyRate, totalMonths);
      emi = (principal * monthlyRate * powerTerm) / (powerTerm - 1);
    }

    // Generate amortization schedule
    const schedule: AmortizationRow[] = [];
    let balance = principal;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;

    for (let month = 1; month <= totalMonths; month++) {
      if (balance <= 0) break;

      const interestPayment = balance * monthlyRate;
      let principalPayment = emi - interestPayment;

      // Apply prepayment
      if (enablePrepayment && month === prepaymentMonth) {
        principalPayment += prepaymentAmount;
      }

      // Adjust if final payment
      if (principalPayment > balance) {
        principalPayment = balance;
      }

      balance -= principalPayment;
      totalInterestPaid += interestPayment;
      totalPrincipalPaid += principalPayment;

      schedule.push({
        month,
        emi: month === prepaymentMonth && enablePrepayment 
          ? emi + prepaymentAmount 
          : emi,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
      });

      if (balance <= 0) break;
    }

    const processingFee = includeProcessingFee
      ? (loanAmount * loanConfigs[loanType].processingFee) / 100
      : 0;

    const totalPayable = totalPrincipalPaid + totalInterestPaid + processingFee;

    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterestPaid),
      processingFee: Math.round(processingFee),
      totalPayable: Math.round(totalPayable),
      schedule,
      principalPercentage: (totalPrincipalPaid / totalPayable) * 100,
      interestPercentage: (totalInterestPaid / totalPayable) * 100,
      feePercentage: (processingFee / totalPayable) * 100,
    };
  }, [
    loanAmount,
    interestRate,
    tenure,
    includeProcessingFee,
    enablePrepayment,
    prepaymentAmount,
    prepaymentMonth,
    loanType,
  ]);

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">EMI Calculator</h1>
          <p className="text-gray-400 text-lg">
            Calculate your loan EMI and view detailed amortization schedule
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main Input Card */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-xl font-bold">Loan Details</h2>

              {/* Loan Type */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Loan Type</label>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="home">Home Loan</option>
                  <option value="car">Car Loan</option>
                  <option value="personal">Personal Loan</option>
                </select>
              </div>

              {/* Loan Amount */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Loan Amount (₹)</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  min="10000"
                  step="10000"
                />
              </div>

              {/* Interest Rate */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">
                  Interest Rate (% per annum)
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  min="1"
                  max="30"
                  step="0.1"
                />
              </div>

              {/* Tenure */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Tenure (Years)</label>
                  <span className="text-white font-semibold">{tenure}</span>
                </div>
                <input
                  type="range"
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  min="1"
                  max="30"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 year</span>
                  <span>30 years</span>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-4 border-t border-gray-700/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeProcessingFee}
                    onChange={(e) => setIncludeProcessingFee(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-700 bg-gray-900/50 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                  />
                  <span className="text-sm">
                    Include Processing Fee ({loanConfigs[loanType].processingFee}%)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePrepayment}
                    onChange={(e) => setEnablePrepayment(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-700 bg-gray-900/50 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                  />
                  <span className="text-sm">Enable Prepayment</span>
                </label>
              </div>
            </div>

            {/* Prepayment Card */}
            {enablePrepayment && (
              <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                <h2 className="text-xl font-bold">Prepayment Details</h2>

                {/* Prepayment Amount */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">
                    Prepayment Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={prepaymentAmount}
                    onChange={(e) => setPrepaymentAmount(Number(e.target.value))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                    min="1000"
                    step="1000"
                  />
                </div>

                {/* Prepayment Month */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-400">
                      Prepayment Month
                    </label>
                    <span className="text-white font-semibold">
                      Month {prepaymentMonth}
                    </span>
                  </div>
                  <input
                    type="range"
                    value={prepaymentMonth}
                    onChange={(e) => setPrepaymentMonth(Number(e.target.value))}
                    min="1"
                    max={tenure * 12}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-8">
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-gray-400 text-sm mb-2">Monthly EMI</p>
                <p className="text-3xl font-bold">
                  ₹{calculations.emi.toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-gray-400 text-sm mb-2">Total Interest</p>
                <p className="text-3xl font-bold">
                  ₹{calculations.totalInterest.toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-gray-400 text-sm mb-2">Processing Fee</p>
                <p className="text-3xl font-bold">
                  ₹{calculations.processingFee.toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-gray-400 text-sm mb-2">Total Payable</p>
                <p className="text-3xl font-bold">
                  ₹{calculations.totalPayable.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-xl font-bold">Payment Breakdown</h2>

              <div className="space-y-4">
                {/* Principal */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Principal Amount</span>
                    <span className="font-semibold">
                      {calculations.principalPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${calculations.principalPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Interest */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Interest Amount</span>
                    <span className="font-semibold">
                      {calculations.interestPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${calculations.interestPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Processing Fee */}
                {includeProcessingFee && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Processing Fee</span>
                      <span className="font-semibold">
                        {calculations.feePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700/30 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${calculations.feePercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    ₹{loanAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Principal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">
                    ₹{calculations.totalInterest.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Interest</p>
                </div>
                {includeProcessingFee && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">
                      ₹{calculations.processingFee.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Fee</p>
                  </div>
                )}
              </div>
            </div>

            {/* Amortization Table */}
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-gray-700/50">
                <h2 className="text-xl font-bold">Amortization Schedule</h2>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-900/90 backdrop-blur-sm">
                    <tr className="border-b border-gray-700/50">
                      <th className="text-left py-3 px-6 text-gray-400 font-semibold text-sm">
                        Month
                      </th>
                      <th className="text-right py-3 px-6 text-gray-400 font-semibold text-sm">
                        EMI
                      </th>
                      <th className="text-right py-3 px-6 text-gray-400 font-semibold text-sm">
                        Principal
                      </th>
                      <th className="text-right py-3 px-6 text-gray-400 font-semibold text-sm">
                        Interest
                      </th>
                      <th className="text-right py-3 px-6 text-gray-400 font-semibold text-sm">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.schedule.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-b border-gray-700/30 last:border-0 hover:bg-white/5 transition-colors ${
                          enablePrepayment && row.month === prepaymentMonth
                            ? "bg-orange-500/10"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-6 text-gray-300">
                          {row.month}
                          {enablePrepayment && row.month === prepaymentMonth && (
                            <span className="ml-2 text-xs text-orange-400">
                              (Prepayment)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-right font-semibold">
                          ₹{Math.round(row.emi).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-right text-green-400">
                          ₹{Math.round(row.principal).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-right text-red-400">
                          ₹{Math.round(row.interest).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-right text-gray-300">
                          ₹{Math.round(row.balance).toLocaleString()}
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
    </div>
  );
}