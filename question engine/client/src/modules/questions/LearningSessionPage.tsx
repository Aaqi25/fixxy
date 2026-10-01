import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { startLearningSession, fetchRetryQuestion, fetchTransferQuestion } from './api';
import type { StudentQuestion, LearningSession } from './question.types';
import { QuestionCard } from './QuestionCard';
import { LoadingQuestion } from './LoadingQuestion';
import { QuestionError } from './QuestionError';
import { SessionError } from './SessionError';
import { ArrowLeft, User, LogOut, CheckCircle2, RotateCcw, ArrowRightLeft } from 'lucide-react';

export const LearningSessionPage: React.FC = () => {
  const { conceptSlug } = useParams<{ conceptSlug: string }>();
  const navigate = useNavigate();
  const { student, logout } = useAuth();

  const [question, setQuestion] = useState<StudentQuestion | null>(null);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionError, setIsSessionError] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedOptionId, setSubmittedOptionId] = useState<string | null>(null);

  const loadInitialQuestion = useCallback(async () => {
    if (!conceptSlug) return;
    setLoading(true);
    setError(null);
    setIsSessionError(false);
    setSubmittedOptionId(null);

    try {
      const data = await startLearningSession(conceptSlug);
      setQuestion(data.question);
      if (data.session) {
        setSession(data.session);
      }
    } catch (err: any) {
      console.error('Failed to start learning session:', err);
      if (err.status === 403 || (err.status === 404 && err.message?.toLowerCase().includes('session'))) {
        setIsSessionError(true);
      }
      setError(err.message || "Couldn't load the question. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [conceptSlug]);

  useEffect(() => {
    loadInitialQuestion();
  }, [loadInitialQuestion]);

  const handleNextStage = async (stage: 'RETRY' | 'TRANSFER') => {
    if (!session) return;
    setLoading(true);
    setError(null);
    setSubmittedOptionId(null);

    try {
      const data = stage === 'RETRY'
        ? await fetchRetryQuestion(session.id)
        : await fetchTransferQuestion(session.id);

      setQuestion(data.question);
      if (data.session) {
        setSession(data.session);
      }
    } catch (err: any) {
      console.error(`Failed to load ${stage} question:`, err);
      setError(err.message || `No ${stage.toLowerCase()} question is currently available.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (selectedOptionId: string) => {
    setSubmitting(true);
    setSubmittedOptionId(selectedOptionId);

    // Simulate submission flow transition (Module 5 interface point)
    setTimeout(() => {
      setSubmitting(false);
    }, 600);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="fixxy-page min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-sky-50 to-blue-200 text-slate-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 px-4 sm:px-8 py-3.5 border-b border-white/60 bg-white/65 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/curriculum')}
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Curriculum
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-sm text-slate-800 tracking-tight">
              {question?.conceptTitle || (conceptSlug ? conceptSlug.replace(/-/g, ' ') : 'Learning')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg border border-white/90 shadow-sm transition-all"
            >
              <User className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <span>{student?.name || 'Profile'}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-red-600 bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg border border-white/90 shadow-sm transition-all"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-4xl mx-auto w-full">
        {loading && <LoadingQuestion />}

        {!loading && isSessionError && (
          <SessionError
            message={error || 'Your learning session is no longer available.'}
            onReturnToCurriculum={() => navigate('/curriculum')}
          />
        )}

        {!loading && !isSessionError && error && (
          <QuestionError
            message={error}
            onRetry={loadInitialQuestion}
            onBackToCurriculum={() => navigate('/curriculum')}
          />
        )}

        {!loading && !error && question && (
          <div className="space-y-6">
            <QuestionCard
              question={question}
              onSubmitAnswer={handleAnswerSubmit}
              isSubmitting={submitting}
              conceptTitle={question.conceptTitle}
            />

            {/* Simulated Stage Stepper for testing / progression */}
            {submittedOptionId && (
              <div
                className="max-w-2xl mx-auto p-4 rounded-2xl border border-white/80 bg-white/75 backdrop-blur-md shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Answer submitted. Advance stage:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNextStage('RETRY')}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Retry Stage
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNextStage('TRANSFER')}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                  >
                    <ArrowRightLeft className="w-3 h-3 mr-1" />
                    Transfer Stage
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
