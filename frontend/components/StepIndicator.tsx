'use client';

interface Step {
  number: number;
  label: string;
  status: 'completed' | 'active' | 'pending';
}

interface StepIndicatorProps {
  steps: Step[];
}

export default function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center space-x-2 md:space-x-3 mb-6 md:mb-8 mt-4">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center">
            {step.status === 'completed' ? (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 md:w-4 md:h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : step.status === 'active' ? (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {step.number}
              </div>
            ) : (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-semibold flex-shrink-0">
                {step.number}
              </div>
            )}
            <span
              className={`ml-1.5 md:ml-2 text-xs ${
                step.status === 'active'
                  ? 'text-white font-medium'
                  : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-6 md:w-8 h-0.5 ml-2 md:ml-3 ${
                step.status === 'completed' ? 'bg-green-600' : 'bg-gray-700'
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
}