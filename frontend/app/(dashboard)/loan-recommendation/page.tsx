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

// Map model's predicted_status to our UI status
function mapStatus(predicted: string): "Approved" | "Rejected" | "Under Review" {
  if (predicted === "Approved") return "Approved";
  if (predicted === "Rejected") return "Rejected";
  return "Under Review"; // "Partial" maps to Under Review
}

// Derive risk level from probabilities
function mapRiskLevel(probabilities: Record<string, number>): "Low" | "Medium" | "High" {
  const rejectedProb = probabilities["Rejected"] ?? 0;
  if (rejectedProb < 0.2) return "Low";
  if (rejectedProb < 0.5) return "Medium";
  return "High";
}

export default function LoanRecommendationPage() {
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<LoanResult | null>(null);
  const [formData, setFormData] = useState<LoanFormData | null>(null); // ← store formData
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (data: LoanFormData) => {
    setLoading(true);
    setError(null);
    setFormData(data); // ← save formData to state

    try {
      const res = await fetch("http://localhost:8000/api/loan/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Prediction failed");

      const json = await res.json();

      const mappedResult: LoanResult = {
        status: mapStatus(json.predicted_status),
        probability: Math.round((json.probabilities?.["Approved"] ?? 0) * 100),
        recommendedAmount: json.estimated_amount,
        riskLevel: mapRiskLevel(json.probabilities ?? {}),
        reason: `Based on your profile, our model predicts a ${json.predicted_status} status with an estimated approved amount of ₹${json.estimated_amount?.toLocaleString()}.`,
      };

      setResult(mappedResult);
      setShowResult(true);
    } catch (err) {
      console.error(err);
      setError("Failed to get recommendation. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShowResult(false);
    setResult(null);
    setFormData(null);
    setError(null);
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

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="space-y-3">
              {[80, 60, 70, 50].map((w, i) => (
                <div
                  key={i}
                  className="h-3 bg-gray-700/60 rounded-full animate-pulse mx-auto"
                  style={{ width: `${w}%` }}
                />
              ))}
              <p className="text-gray-400 text-sm pt-2">Analyzing your profile...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!showResult && !loading && (
          <LoanForm onSubmit={handleFormSubmit} />
        )}

        {/* Result — passes both result AND formData */}
        {showResult && result && formData && (
          <LoanResultCard
            result={result}
            formData={formData}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}