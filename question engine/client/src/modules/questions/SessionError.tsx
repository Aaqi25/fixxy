import React from 'react';
import { BookOpen, ShieldAlert } from 'lucide-react';

interface SessionErrorProps {
  message?: string;
  onReturnToCurriculum: () => void;
}

export const SessionError: React.FC<SessionErrorProps> = ({
  message = 'Your learning session is no longer available or has expired.',
  onReturnToCurriculum,
}) => {
  return (
    <div
      role="alert"
      className="w-full max-w-xl mx-auto rounded-3xl p-8 border shadow-xl text-center"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shadow-sm">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">Session Unavailable</h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
        {message}
      </p>

      <button
        type="button"
        onClick={onReturnToCurriculum}
        className="inline-flex items-center px-6 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Return to Curriculum
      </button>
    </div>
  );
};
