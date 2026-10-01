import React from 'react';

export const LoadingQuestion: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-2xl mx-auto rounded-3xl p-6 sm:p-8 border shadow-xl animate-pulse"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/50">
        <div className="h-6 w-28 bg-slate-200/80 rounded-full" />
        <div className="h-4 w-24 bg-slate-200/60 rounded" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-3 mb-8">
        <div className="h-6 bg-slate-200/80 rounded-lg w-11/12" />
        <div className="h-6 bg-slate-200/70 rounded-lg w-3/4" />
      </div>

      {/* Options skeleton */}
      <div className="space-y-3.5 my-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center p-4 rounded-xl border border-white/60 bg-white/50"
          >
            <div className="w-6 h-6 rounded-full bg-slate-200/80 mr-3.5 flex-shrink-0" />
            <div className="h-4 bg-slate-200/80 rounded w-5/6" />
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="pt-4 flex justify-end border-t border-slate-200/50">
        <div className="h-11 w-36 bg-slate-200/80 rounded-xl" />
      </div>

      <span className="sr-only">Loading question...</span>
    </div>
  );
};
