"use client";

import { useEffect, useState } from "react";

interface LoanResult {
  status: "Approved" | "Rejected" | "Under Review";
  probability: number;
  recommendedAmount: number;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
}

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

interface AIAdvice {
  summary: string;
  documents: string[];
  steps: string[];
  tips: string[];
}

interface LoanAIAdvisorProps {
  result: LoanResult;
  formData: LoanFormData;
}

export default function LoanAIAdvisor({ result, formData }: LoanAIAdvisorProps) {
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:8000/api/loan/ai-advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            result: {
              status: result.status,
              probability: result.probability,
              recommendedAmount: result.recommendedAmount,
              riskLevel: result.riskLevel,
              reason: result.reason ?? "",
            },
            formData: {
              age: formData.age,
              employment_type: formData.employment_type,
              monthly_income: formData.monthly_income,
              credit_score: formData.credit_score,
              savings: formData.savings,
              existing_loan: formData.existing_loan,
              loan_purpose: formData.loan_purpose,
              requested_amount: formData.requested_amount,
              tenure_years: formData.tenure_years,
              collateral: formData.collateral,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("AI advice error:", errData);
          throw new Error("Failed to fetch AI advice");
        }

        const data = await res.json();
        setAdvice(data.advice);
      } catch (err) {
        console.error(err);
        setError("Could not load AI advice. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdvice();
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center text-base">
          🤖
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">AI Loan Advisor</h3>
          <p className="text-xs text-gray-400">Powered by Google Gemini</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[90, 75, 85, 60].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-gray-700/60 rounded-full animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
          <p className="text-sm text-gray-500 pt-2">Analyzing your profile...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Advice Content */}
      {advice && !loading && (
        <div className="space-y-6">

          {/* Summary */}
          <p className="text-gray-300 leading-relaxed text-sm">{advice.summary}</p>

          {/* Documents Required */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">📄 Documents You Will Need</h4>
            <ul className="space-y-2">
              {advice.documents.map((doc, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <span className="mt-0.5 w-5 h-5 bg-gray-700/60 border border-gray-600/60 rounded-full flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">🪜 Next Steps</h4>
            <ul className="space-y-2">
              {advice.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <span className="mt-0.5 w-5 h-5 bg-gray-700/60 border border-gray-600/60 rounded-full flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">💡 Tips to Improve Your Chances</h4>
            <ul className="space-y-2">
              {advice.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-orange-500 flex-shrink-0">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}