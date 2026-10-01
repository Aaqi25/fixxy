import React from 'react';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

interface QuestionErrorProps {
  message?: string;
  onRetry?: () => void;
  onBackToCurriculum?: () => void;
}

export const QuestionError: React.FC<QuestionErrorProps> = ({
  message = "Couldn't load the question. Please try again.",
  onRetry,
  onBackToCurriculum,
}) => {
  return (
    <div
      role="alert"
      className="w-full max-w-xl mx-auto rounded-3xl p-8 border shadow-xl text-center"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(239, 68, 68, 0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-200/70 flex items-center justify-center text-red-500 shadow-sm">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">Question Unavailable</h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center px-5 py-2.5 rounded-xl font-medium text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        )}

        {onBackToCurriculum && (
          <button
            type="button"
            onClick={onBackToCurriculum}
            className="inline-flex items-center px-5 py-2.5 rounded-xl font-medium text-sm bg-white/80 hover:bg-white text-slate-700 border border-slate-300/70 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Curriculum
          </button>
        )}
      </div>
    </div>
  );
};
