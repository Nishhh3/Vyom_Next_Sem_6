import RiskBadge from "./RiskBadge";
import ConfidenceBar from "./ConfidenceBar";

interface LoanResult {
  status: "Approved" | "Rejected" | "Under Review";
  probability: number;
  recommendedAmount: number;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
}

interface LoanResultCardProps {
  result: LoanResult;
  onReset: () => void;
}

export default function LoanResultCard({ result, onReset }: LoanResultCardProps) {
  const statusStyles = {
    Approved: "from-green-600/20 to-emerald-600/20 border-green-500/30",
    Rejected: "from-red-600/20 to-orange-600/20 border-red-500/30",
    "Under Review": "from-yellow-600/20 to-amber-600/20 border-yellow-500/30",
  };

  const statusIcons = {
    Approved: "✅",
    Rejected: "❌",
    "Under Review": "⏳",
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div
        className={`bg-gradient-to-br ${statusStyles[result.status]} border rounded-2xl p-8 backdrop-blur-sm text-center`}
      >
        <div className="text-6xl mb-4">{statusIcons[result.status]}</div>
        <h2 className="text-3xl font-bold mb-2">Loan {result.status}</h2>
        <p className="text-gray-400">
          Your loan application has been {result.status.toLowerCase()}
        </p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommended Amount */}
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-sm text-gray-400 mb-2">Recommended Loan Amount</p>
          <p className="text-3xl font-bold text-white">
            ₹{result.recommendedAmount.toLocaleString()}
          </p>
        </div>

        {/* Risk Level */}
        <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
          <p className="text-sm text-gray-400 mb-3">Risk Assessment</p>
          <RiskBadge level={result.riskLevel} />
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <ConfidenceBar percentage={result.probability} />
      </div>

      {/* Explanation */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-3">Analysis Summary</h3>
        <p className="text-gray-300 leading-relaxed">{result.reason}</p>
      </div>

      {/* Key Factors */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-4">Key Factors Considered</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Income Stability</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Credit History</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Debt-to-Income Ratio</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Loan Purpose</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Collateral Status</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-300">Tenure Period</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onReset}
          className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-4 rounded-xl transition-all"
        >
          Submit New Application
        </button>
        <button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-500/50">
          Proceed with Application
        </button>
      </div>
    </div>
  );
}