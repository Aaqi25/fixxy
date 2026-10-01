import React from 'react';
import type { QuestionStage as StageType } from './question.types';
import { getStageLabel, getStageColorClasses } from './question.utils';
import { Sparkles, RotateCcw, ArrowRightLeft, BookOpen } from 'lucide-react';

interface QuestionStageProps {
  stage: StageType | string;
  className?: string;
  showIcon?: boolean;
}

export const QuestionStage: React.FC<QuestionStageProps> = ({
  stage,
  className = '',
  showIcon = true,
}) => {
  const label = getStageLabel(stage);
  const colors = getStageColorClasses(stage);

  const renderIcon = () => {
    switch (stage?.toUpperCase()) {
      case 'PRACTICE':
        return <BookOpen className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />;
      case 'RETRY':
        return <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />;
    }
  };

  return (
    <div
      role="status"
      aria-label={`Current stage: ${label}`}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm transition-all duration-300 ${className}`}
      style={{
        backgroundColor: colors.badgeBg,
        color: colors.badgeText,
        border: `1px solid ${colors.badgeBorder}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {showIcon && renderIcon()}
      <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: colors.dotColor }} />
      <span>{label}</span>
    </div>
  );
};
