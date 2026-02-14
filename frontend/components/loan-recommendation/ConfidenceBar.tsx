interface ConfidenceBarProps {
  percentage: number;
}

export default function ConfidenceBar({ percentage }: ConfidenceBarProps) {
  const getColor = () => {
    if (percentage >= 70) return "from-green-500 to-emerald-500";
    if (percentage >= 50) return "from-yellow-500 to-amber-500";
    return "from-red-500 to-orange-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Approval Probability</span>
        <span className="text-lg font-bold">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-700/30 rounded-full h-4 overflow-hidden">
        <div
          className={`bg-gradient-to-r ${getColor()} h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 15 && (
            <span className="text-xs font-bold text-white drop-shadow-lg">
              {percentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}