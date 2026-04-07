import { useEffect, useState } from 'react';

const STEPS = [
  { icon: 'upload_file', text: 'Uploading document...' },
  { icon: 'document_scanner', text: 'Scanning with OCR...' },
  { icon: 'psychology', text: 'AI is reading your document...' },
  { icon: 'translate', text: 'Translating to local language...' },
  { icon: 'fact_check', text: 'Verifying medical accuracy...' },
  { icon: 'check_circle', text: 'Almost done, finishing up...' },
];

function ProcessingSteps({ isActive }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="space-y-3 py-4">
      {STEPS.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
              isCurrent
                ? 'bg-teal-400/10 border border-teal-400/20'
                : isComplete
                  ? 'opacity-60'
                  : 'opacity-30'
            }`}
          >
            <span
              className={`material-symbols-outlined text-lg transition-colors ${
                isComplete ? 'text-green-400' : isCurrent ? 'text-teal-300 animate-pulse' : 'text-slate-500'
              }`}
            >
              {isComplete ? 'check_circle' : step.icon}
            </span>
            <span
              className={`text-sm font-medium ${
                isCurrent ? 'text-teal-200' : isComplete ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {step.text}
            </span>
            {isCurrent && (
              <span className="ml-auto flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ProcessingSteps;
