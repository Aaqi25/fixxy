import React from 'react';
import type { QuestionOption } from './question.types';

interface QuestionOptionsProps {
  options: QuestionOption[];
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  disabled?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const QuestionOptions: React.FC<QuestionOptionsProps> = ({
  options,
  selectedOptionId,
  onSelectOption,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (disabled) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelectOption(options[index].id);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onSelectOption(options[nextIndex].id);
      const nextEl = document.getElementById(`option-${options[nextIndex].id}`);
      nextEl?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onSelectOption(options[prevIndex].id);
      const prevEl = document.getElementById(`option-${options[prevIndex].id}`);
      prevEl?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Question answer options"
      className="space-y-3.5 my-6"
    >
      {options.map((option, idx) => {
        const isSelected = selectedOptionId === option.id;
        const letter = OPTION_LETTERS[idx] || `${idx + 1}`;

        return (
          <div
            key={option.id}
            id={`option-${option.id}`}
            role="radio"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onSelectOption(option.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`group relative flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 border text-left outline-none ${
              disabled ? 'cursor-not-allowed opacity-75' : ''
            } ${
              isSelected
                ? 'bg-blue-50/80 border-blue-500/60 shadow-md ring-2 ring-blue-500/20'
                : 'bg-white/70 hover:bg-white/95 border-white/80 hover:border-blue-300/60 shadow-sm'
            }`}
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Custom Radio Icon */}
            <div className="flex-shrink-0 mt-0.5 mr-3.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                    : 'bg-slate-100 text-slate-600 border border-slate-300/80 group-hover:border-blue-400 group-hover:bg-blue-50/50'
                }`}
              >
                {letter}
              </div>
            </div>

            {/* Option text */}
            <div className="flex-1 text-sm md:text-base leading-relaxed text-slate-800 select-none">
              {option.text}
            </div>

            {/* Selection Checkmark Indicator */}
            {isSelected && (
              <div className="flex-shrink-0 ml-2 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
