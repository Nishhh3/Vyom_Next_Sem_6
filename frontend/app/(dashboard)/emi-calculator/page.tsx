// File: app/(dashboard)/emi-calculator/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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

// ─── Pie Tooltip ──────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 border border-gray-700/60 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-gray-300 font-semibold mb-0.5">{payload[0].name}</p>
        <p className="text-white">
          ₹{Number(payload[0].value).toLocaleString()}
          <span className="text-gray-400 ml-1">
            ({payload[0].payload.percent}%)
          </span>
        </p>
      </div>
    );
  }
  return null;
};

// ─── Bar Tooltip ──────────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 border border-gray-700/60 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-gray-400 mb-1">Month {label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }} className="font-semibold">
            {p.name}: ₹{Math.round(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Pie Legend ───────────────────────────────────────────────────────────────
const PieLegend = ({
  items,
}: {
  items: { name: string; color: string; value: string; percent: string }[];
}) => (
  <div className="flex flex-col gap-2 mt-3">
    {items.map((item) => (
      <div key={item.name} className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-400">{item.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">{item.value}</span>
          <span className="text-gray-500 w-9 text-right">{item.percent}%</span>
        </div>
      </div>
    ))}
  </div>
);

export default function EMICalculatorPage() {
  // ─── Input States ─────────────────────────────────────────────────────────
  const [loanType, setLoanType] = useState<string>("home");
  const [loanAmount, setLoanAmount] = useState<number>(2500000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenure, setTenure] = useState<number>(20);
  const [includeProcessingFee, setIncludeProcessingFee] =
    useState<boolean>(true);
  const [enablePrepayment, setEnablePrepayment] = useState<boolean>(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(100000);
  const [prepaymentMonth, setPrepaymentMonth] = useState<number>(12);

  useEffect(() => {
    setInterestRate(loanConfigs[loanType].interestRate);
  }, [loanType]);

  // ─── EMI Calculations — untouched ────────────────────────────────────────
  const calculations = useMemo(() => {
    const principal = loanAmount;
    const monthlyRate = interestRate / (12 * 100);
    const totalMonths = tenure * 12;

    let emi = 0;
    if (monthlyRate === 0) {
      emi = principal / totalMonths;
    } else {
      const powerTerm = Math.pow(1 + monthlyRate, totalMonths);
      emi = (principal * monthlyRate * powerTerm) / (powerTerm - 1);
    }

    const schedule: AmortizationRow[] = [];
    let balance = principal;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;

    for (let month = 1; month <= totalMonths; month++) {
      if (balance <= 0) break;

      const interestPayment = balance * monthlyRate;
      let principalPayment = emi - interestPayment;

      if (enablePrepayment && month === prepaymentMonth) {
        principalPayment += prepaymentAmount;
      }
      if (principalPayment > balance) {
        principalPayment = balance;
      }

      balance -= principalPayment;
      totalInterestPaid += interestPayment;
      totalPrincipalPaid += principalPayment;

      schedule.push({
        month,
        emi:
          month === prepaymentMonth && enablePrepayment
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

  // ─── Chart Data ───────────────────────────────────────────────────────────

  // Pie / Donut — cost distribution
  const pieData = useMemo(() => {
    const items = [
      {
        name: "Principal",
        value: loanAmount,
        color: "#22c55e",
        percent: calculations.principalPercentage.toFixed(1),
      },
      {
        name: "Interest",
        value: calculations.totalInterest,
        color: "#ef4444",
        percent: calculations.interestPercentage.toFixed(1),
      },
    ];
    if (includeProcessingFee && calculations.processingFee > 0) {
      items.push({
        name: "Processing Fee",
        value: calculations.processingFee,
        color: "#eab308",
        percent: calculations.feePercentage.toFixed(1),
      });
    }
    return items;
  }, [calculations, loanAmount, includeProcessingFee]);

  const pieLegendItems = pieData.map((d) => ({
    name: d.name,
    color: d.color,
    value: `₹${d.value.toLocaleString()}`,
    percent: d.percent,
  }));

  // Bar chart — Principal vs Interest sampled every year (12 months)
  const barChartData = useMemo(() => {
    const yearly: { year: number; principal: number; interest: number }[] = [];
    const schedule = calculations.schedule;
    const totalMonths = schedule.length;

    for (let y = 0; y < Math.ceil(totalMonths / 12); y++) {
      const slice = schedule.slice(y * 12, y * 12 + 12);
      const totalPrincipal = slice.reduce((s, r) => s + r.principal, 0);
      const totalInterest = slice.reduce((s, r) => s + r.interest, 0);
      yearly.push({
        year: y + 1,
        principal: Math.round(totalPrincipal),
        interest: Math.round(totalInterest),
      });
    }
    return yearly;
  }, [calculations.schedule]);

  // Y-axis short formatter
  const formatYAxis = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return `${value}`;
  };

  // Quick stats for insights card
  const totalMonthsActual = calculations.schedule.length;
  const halfwayMonth = Math.ceil(totalMonthsActual / 2);
  const halfwayRow = calculations.schedule[halfwayMonth - 1];
  const interestRatio = (
    (calculations.totalInterest / calculations.totalPayable) *
    100
  ).toFixed(1);
  const effectiveCost = (
    (calculations.totalPayable / loanAmount - 1) *
    100
  ).toFixed(1);

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

          {/* ── Left Column — Inputs ─────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <h2 className="text-xl font-bold">Loan Details</h2>

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

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">
                    Tenure (Years)
                  </label>
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

              <div className="space-y-3 pt-4 border-t border-gray-700/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeProcessingFee}
                    onChange={(e) => setIncludeProcessingFee(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-700 bg-gray-900/50 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                  />
                  <span className="text-sm">
                    Include Processing Fee (
                    {loanConfigs[loanType].processingFee}%)
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

            {enablePrepayment && (
              <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                <h2 className="text-xl font-bold">Prepayment Details</h2>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">
                    Prepayment Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={prepaymentAmount}
                    onChange={(e) =>
                      setPrepaymentAmount(Number(e.target.value))
                    }
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                    min="1000"
                    step="1000"
                  />
                </div>

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

          {/* ── Right Column — Results ───────────────────────────────────── */}
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
                      style={{
                        width: `${calculations.principalPercentage}%`,
                      }}
                    />
                  </div>
                </div>

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

          </div>
          {/* ── End Right Column ─────────────────────────────────────────── */}

        </div>

        {/* ════════════════════════════════════════════════════════════════
            Full-width row: Pie chart (left, 1/3) + Amortization (right, 2/3)
            Matches the exact column widths of the grid above — no empty gap
            ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Pie Chart — occupies the same 1/3 width as the inputs column */}
          <div className="lg:col-span-1 bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
            <h2 className="text-base font-bold">Cost Distribution</h2>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">
              Principal · Interest · Fee
            </p>

            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <PieLegend items={pieLegendItems} />

            {/* Total payable callout */}
            <div className="mt-4 pt-4 border-t border-gray-700/50 text-center">
              <p className="text-xs text-gray-500">Total Payable</p>
              <p className="text-xl font-bold text-white mt-0.5">
                ₹{calculations.totalPayable.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Amortization Table — occupies the same 2/3 width as results column */}
          <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-bold">Amortization Schedule</h2>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[26%]" />
                </colgroup>
                <thead className="sticky top-0 bg-gray-900/90 backdrop-blur-sm">
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                      Month
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">
                      EMI
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">
                      Principal
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">
                      Interest
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">
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
                      <td className="py-2.5 px-4 text-gray-300 text-sm">
                        {row.month}
                        {enablePrepayment && row.month === prepaymentMonth && (
                          <span className="ml-1.5 text-xs text-orange-400">
                            (Prepayment)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-sm">
                        ₹{Math.round(row.emi).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-green-400 text-sm">
                        ₹{Math.round(row.principal).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-red-400 text-sm">
                        ₹{Math.round(row.interest).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-gray-300 text-sm">
                        ₹{Math.round(row.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        {/* ── End Pie + Amortization Row ────────────────────────────────── */}

        {/* ════════════════════════════════════════════════════════════════
            Analytics Charts Row — Yearly Bar + Insights (2 columns)
            ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Chart 1 — Yearly Principal vs Interest Bar */}
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-base font-bold">Yearly Breakdown</h2>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              Principal vs Interest paid each year
            </p>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={barChartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff07"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Year",
                    position: "insideBottom",
                    offset: -2,
                    fill: "#4b5563",
                    fontSize: 10,
                  }}
                  height={24}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="principal"
                  name="Principal"
                  fill="#22c55e"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="interest"
                  name="Interest"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Mini legend */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-shrink-0" />
                Principal
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0" />
                Interest
              </div>
            </div>
          </div>

          {/* Chart 2 — Loan Insights stat card */}
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold">Loan Insights</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Key metrics at a glance
              </p>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {/* Stat row */}
              <div className="flex items-center justify-between py-3 border-b border-gray-700/40">
                <div>
                  <p className="text-xs text-gray-500">Loan Duration</p>
                  <p className="text-white font-bold text-lg mt-0.5">
                    {tenure} yrs
                    <span className="text-gray-500 text-xs font-normal ml-1">
                      ({totalMonthsActual} months)
                    </span>
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-700/40">
                <div>
                  <p className="text-xs text-gray-500">Interest Burden</p>
                  <p className="text-red-400 font-bold text-lg mt-0.5">
                    {interestRatio}%
                    <span className="text-gray-500 text-xs font-normal ml-1">
                      of total cost
                    </span>
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-700/40">
                <div>
                  <p className="text-xs text-gray-500">Effective Cost</p>
                  <p className="text-yellow-400 font-bold text-lg mt-0.5">
                    +{effectiveCost}%
                    <span className="text-gray-500 text-xs font-normal ml-1">
                      over principal
                    </span>
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs text-gray-500">Balance at Midpoint</p>
                  <p className="text-green-400 font-bold text-lg mt-0.5">
                    ₹{halfwayRow
                      ? Math.round(halfwayRow.balance).toLocaleString()
                      : "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    at month {halfwayMonth}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        </div>
        {/* ── End Charts Row ────────────────────────────────────────────── */}

      </div>
    </div>
  );
}