import React, { useState } from 'react';
import type { StudentQuestion } from './question.types';
import { QuestionStage } from './QuestionStage';
import { QuestionOptions } from './QuestionOptions';
import { getDifficultyBadge } from './question.utils';
import { Send, Award } from 'lucide-react';

interface QuestionCardProps {
  question: StudentQuestion;
  onSubmitAnswer?: (selectedOptionId: string) => Promise<void> | void;
  isSubmitting?: boolean;
  conceptTitle?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onSubmitAnswer,
  isSubmitting = false,
  conceptTitle,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId || isSubmitting) return;
    if (onSubmitAnswer) {
      onSubmitAnswer(selectedOptionId);
    }
  };

  const title = conceptTitle || question.conceptTitle || 'Concept Question';

  return (
    <div
      className="w-full max-w-2xl mx-auto rounded-3xl p-6 sm:p-8 transition-all duration-300 shadow-xl border"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        borderColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header bar: Stage + Difficulty + Concept */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <QuestionStage stage={question.stage} />
          {question.difficulty && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100/90 text-slate-600 border border-slate-200/60">
              {getDifficultyBadge(question.difficulty)}
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-blue-500" />
          <span>{title}</span>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="mb-6">
        <h2
          id={`question-title-${question.id}`}
          className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug tracking-tight"
        >
          {question.text}
        </h2>
      </div>

      {/* Options */}
      <form onSubmit={handleSubmit}>
        <QuestionOptions
          options={question.options}
          selectedOptionId={selectedOptionId}
          onSelectOption={setSelectedOptionId}
          disabled={isSubmitting}
        />

        {/* Action Button */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200/60">
          <button
            type="submit"
            disabled={!selectedOptionId || isSubmitting}
            className={`inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
              !selectedOptionId || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Submit Answer</span>
                <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
