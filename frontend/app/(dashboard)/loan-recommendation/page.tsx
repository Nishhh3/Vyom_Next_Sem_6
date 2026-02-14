"use client";

import { useState } from "react";
import LoanForm from "@/components/loan-recommendation/LoanForm";
import LoanResultCard from "@/components/loan-recommendation/LoanResultCard";

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

interface LoanResult {
  status: "Approved" | "Rejected" | "Under Review";
  probability: number;
  recommendedAmount: number;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
}

export default function LoanRecommendationPage() {
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<LoanResult | null>(null);

  const generateMockResult = (formData: LoanFormData): LoanResult => {
    // Mock AI recommendation logic
    const creditScore = formData.credit_score;
    const income = formData.monthly_income;
    const requestedAmount = formData.requested_amount;
    const hasCollateral = formData.collateral === "Yes";
    const hasExistingLoan = formData.existing_loan === "Yes";
    const isSalaried = formData.employment_type === "Salaried";

    let status: "Approved" | "Rejected" | "Under Review" = "Approved";
    let probability = 0;
    let recommendedAmount = requestedAmount;
    let riskLevel: "Low" | "Medium" | "High" = "Medium";
    let reason = "";

    // Complex mock logic based on multiple factors
    if (creditScore >= 750 && income >= 50000 && isSalaried && !hasExistingLoan) {
      status = "Approved";
      probability = 85;
      recommendedAmount = requestedAmount;
      riskLevel = "Low";
      reason = `Excellent profile! Your credit score of ${creditScore}, stable salaried income of ₹${income.toLocaleString()}/month, and absence of existing loans make you an ideal candidate. Full requested amount of ₹${requestedAmount.toLocaleString()} approved for ${formData.tenure_years} years.`;
    } else if (creditScore >= 700 && income >= 40000) {
      status = "Approved";
      probability = 78;
      recommendedAmount = hasCollateral
        ? requestedAmount
        : Math.floor(requestedAmount * 0.9);
      riskLevel = "Low";
      reason = `Strong application with credit score ${creditScore} and monthly income ₹${income.toLocaleString()}. ${
        hasCollateral
          ? "Collateral backing allows full amount approval."
          : "Recommended amount is 90% of requested due to no collateral."
      } Loan purpose: ${formData.loan_purpose}.`;
    } else if (creditScore >= 650 && income >= 30000) {
      status = "Approved";
      probability = 72;
      recommendedAmount = Math.floor(requestedAmount * 0.75);
      riskLevel = "Medium";
      reason = `Your credit score (${creditScore}) and monthly income (₹${income.toLocaleString()}) support approval for 75% of requested amount. ${
        hasExistingLoan
          ? "Existing loan obligations considered in assessment."
          : ""
      } ${
        isSalaried
          ? "Salaried employment adds stability."
          : "Unsalaried employment requires closer monitoring."
      } Tenure of ${formData.tenure_years} years is manageable.`;
    } else if (creditScore >= 600 && income >= 25000) {
      status = "Under Review";
      probability = 55;
      recommendedAmount = Math.floor(requestedAmount * 0.6);
      riskLevel = "Medium";
      reason = `Application requires additional review. Credit score ${creditScore} is acceptable but borderline. Monthly income ₹${income.toLocaleString()} meets minimum threshold. ${
        hasCollateral
          ? "Collateral provided improves chances significantly."
          : "Consider providing collateral for better terms."
      } May approve up to 60% of requested amount pending verification.`;
    } else if (creditScore >= 550) {
      status = "Under Review";
      probability = 45;
      recommendedAmount = Math.floor(requestedAmount * 0.5);
      riskLevel = "High";
      reason = `Credit score ${creditScore} is below preferred range. Income verification required. ${
        hasExistingLoan
          ? "Existing loan increases risk profile."
          : ""
      } ${
        hasCollateral
          ? "Collateral may help secure up to 50% approval."
          : "Strong collateral recommended to improve approval chances."
      } Please be prepared for additional documentation.`;
    } else {
      status = "Rejected";
      probability = 25;
      recommendedAmount = 0;
      riskLevel = "High";
      reason = `Unfortunately, current credit score (${creditScore}) ${
        income < 25000
          ? "and monthly income (₹" + income.toLocaleString() + ")"
          : ""
      } do not meet minimum lending criteria. We recommend: (1) Improve credit score to above 600, (2) ${
        !isSalaried ? "Establish stable employment, (3) " : ""
      }Wait 6-12 months and reapply, ${
        !hasCollateral ? "(3) Consider secured loan with collateral" : ""
      }. Loan purpose '${formData.loan_purpose}' noted for future reference.`;
    }

    return {
      status,
      probability,
      recommendedAmount,
      riskLevel,
      reason,
    };
  };

  const handleFormSubmit = (formData: LoanFormData) => {
    // Simulate processing delay
    const mockResult = generateMockResult(formData);
    setResult(mockResult);
    setShowResult(true);
  };

  const handleReset = () => {
    setShowResult(false);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold">
            AI Loan Recommendation System
          </h1>
          <p className="text-gray-400 text-lg">
            {showResult
              ? "Here's your personalized loan recommendation"
              : "Get instant AI-powered loan approval recommendations based on your profile"}
          </p>
        </div>

        {/* Info Banner */}
        {!showResult && (
          <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Quick Info</h3>
                <p className="text-gray-300 text-sm">
                  Fill in your details accurately. Our AI analyzes your credit score,
                  income, employment type, and other factors to provide instant loan
                  recommendations with approval probability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!showResult ? (
          <LoanForm onSubmit={handleFormSubmit} />
        ) : (
          result && <LoanResultCard result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}