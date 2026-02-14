interface RiskBadgeProps {
  level: "Low" | "Medium" | "High";
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const styles = {
    Low: "bg-green-500/20 text-green-400 border-green-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    High: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${styles[level]}`}
    >
      {level} Risk
    </span>
  );
}