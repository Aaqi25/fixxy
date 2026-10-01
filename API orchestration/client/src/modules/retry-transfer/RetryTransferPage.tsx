import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getSessionById,
  getSessionByConcept,
  advanceSessionStage,
  submitRetryOrTransferAnswer,
} from './api';
import type {
  LearningStage as LearningStageType,
  RetryTransferSessionData,
  SafeQuestion,
  TeachingResponse,
} from './retry-transfer.types';
import { LearningStage } from './LearningStage';
import { TeachingPanel } from './TeachingPanel';
import { RetryPanel } from './RetryPanel';
import { TransferPanel } from './TransferPanel';

export const RetryTransferPage: React.FC = () => {
  const { slug, sessionId: routeSessionId } = useParams<{ slug?: string; sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const querySessionId = searchParams.get('session');
  const targetSessionId = routeSessionId || querySessionId;

  const { student, logout } = useAuth();
  const navigate = useNavigate();

  // Session state
  const [session, setSession] = useState<RetryTransferSessionData | null>(null);
  const [stage, setStage] = useState<LearningStageType>('TEACHING');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Restoring your learning session...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Question & submission state
  const [activeQuestion, setActiveQuestion] = useState<SafeQuestion | null>(null);
  const [teachingData, setTeachingData] = useState<TeachingResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{ correct: boolean } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  // Initialize or restore session from backend
  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      let data: RetryTransferSessionData;
      if (targetSessionId) {
        setLoadingMessage('Restoring your learning session...');
        data = await getSessionById(targetSessionId);
      } else if (slug) {
        setLoadingMessage('Loading concept tutoring session...');
        data = await getSessionByConcept(slug);
      } else {
        setErrorMessage('No concept or session specified.');
        setIsLoading(false);
        return;
      }

      setSession(data);
      if (data.teaching) setTeachingData(data.teaching);
      if (data.question) setActiveQuestion(data.question);

      // Determine initial UI stage from backend authoritative stage
      const backendStage = data.stage?.toUpperCase();
      if (data.isCompleted || backendStage === 'COMPLETED') {
        setStage('COMPLETED');
      } else if (backendStage === 'TRANSFER') {
        setStage('TRANSFER_READY');
      } else if (backendStage === 'RETRY') {
        setStage('RETRY_READY');
      } else if (backendStage === 'RETEACHING') {
        setStage('RETEACHING');
      } else {
        setStage('TEACHING');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Your learning session could not be restored.');
    } finally {
      setIsLoading(false);
    }
  }, [targetSessionId, slug]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Action: Student continues from Teaching to Retry Question
  const handleContinueToRetry = async () => {
    if (!session) return;
    setIsAdvancing(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const updated = await advanceSessionStage(session.id, 'RETRY');
      setSession(updated);
      if (updated.question) setActiveQuestion(updated.question);
      setStage('RETRY_READY');
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't load the retry question. Please try again.");
    } finally {
      setIsAdvancing(false);
    }
  };

  // Action: Submit Retry answer
  const handleSubmitRetry = async (selectedOptionId: string) => {
    if (!session || !activeQuestion || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitRetryOrTransferAnswer({
        questionId: activeQuestion.id,
        selectedOptionId,
        sessionId: session.id,
      });

      const isCorrect = res.result.correct;
      setSubmitResult({ correct: isCorrect });

      if (isCorrect) {
        setStage('RETRY_CORRECT');
      } else {
        setStage('RETRY_WRONG');
      }

      // Refresh session state to sync backend-orchestrated stage
      const freshSession = await getSessionById(session.id);
      setSession(freshSession);
      if (freshSession.teaching) setTeachingData(freshSession.teaching);
    } catch (err: any) {
      setSubmitError(err.message || "Couldn't submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Transition from Retry Correct to Transfer Question
  const handleContinueToTransfer = async () => {
    if (!session) return;
    setIsAdvancing(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const updated = await advanceSessionStage(session.id, 'TRANSFER');
      setSession(updated);
      if (updated.question) setActiveQuestion(updated.question);
      setStage('TRANSFER_READY');
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't load the transfer question. Please try again.");
    } finally {
      setIsAdvancing(false);
    }
  };

  // Action: Submit Transfer answer
  const handleSubmitTransfer = async (selectedOptionId: string) => {
    if (!session || !activeQuestion || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitRetryOrTransferAnswer({
        questionId: activeQuestion.id,
        selectedOptionId,
        sessionId: session.id,
      });

      const isCorrect = res.result.correct;
      setSubmitResult({ correct: isCorrect });

      if (isCorrect) {
        setStage('TRANSFER_PASS');
      } else {
        setStage('TRANSFER_FAIL');
      }

      const freshSession = await getSessionById(session.id);
      setSession(freshSession);
      if (freshSession.teaching) setTeachingData(freshSession.teaching);
    } catch (err: any) {
      setSubmitError(err.message || "Couldn't submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: View Completion from successful transfer
  const handleViewCompletion = () => {
    setStage('COMPLETED');
  };

  // Action: Transition to Reteaching after failed retry or transfer
  const handleContinueToReteach = async () => {
    if (!session) return;
    setIsAdvancing(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const freshSession = await getSessionById(session.id);
      setSession(freshSession);
      if (freshSession.teaching) setTeachingData(freshSession.teaching);
      setStage('RETEACHING');
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't load your tutoring response. Please try again.");
    } finally {
      setIsAdvancing(false);
    }
  };

  // Action: Continue from Reteaching back to Retry Question
  const handleContinueFromReteach = async () => {
    if (!session) return;
    setIsAdvancing(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const updated = await advanceSessionStage(session.id, 'RETRY');
      setSession(updated);
      if (updated.question) setActiveQuestion(updated.question);
      setStage('RETRY_READY');
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't load the retry question. Please try again.");
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const conceptTitle = session?.conceptTitle || slug?.replace(/-/g, ' ') || 'Concept';
  const conceptSlug = session?.conceptSlug || slug || 'curriculum';

  return (
    <div className="fixxy-page retry-transfer-page-container" style={{ minHeight: '100vh' }}>
      {/* Top Glass Navigation Bar */}
      <header className="glass top-nav-bar" role="banner">
        <div className="nav-brand-group">
          <Link to="/curriculum" className="brand-logo-link" aria-label="FIXXY Curriculum Home">
            <span className="brand-fixxy-gradient">FIXXY</span>
            <span className="brand-module-tag">Adaptive Tutor</span>
          </Link>
          <span className="breadcrumb-divider">/</span>
          <Link to={`/curriculum/${conceptSlug}`} className="breadcrumb-concept-link">
            {conceptTitle}
          </Link>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-active-tag">
            {stage === 'COMPLETED' ? 'Completed' : stage === 'TEACHING' || stage === 'RETEACHING' ? 'Tutoring' : stage.startsWith('RETRY') ? 'Retry' : 'Transfer'}
          </span>
        </div>

        <div className="nav-user-actions">
          <Link to="/profile" className="profile-pill-link" aria-label="Student Profile">
            <span className="profile-user-avatar">
              {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </span>
            <span className="profile-user-name">{student?.name?.split(' ')[0] || 'Student'}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            id="nav-logout-btn"
            className="secondary-button nav-logout-btn"
            aria-label="Log out"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main Learning Experience Area */}
      <main className="retry-transfer-main" role="main">
        {/* Stage Progress Stepper */}
        <div className="stage-stepper-container">
          <LearningStage currentStage={stage} session={session} />
        </div>

        {/* Loading State Banner */}
        {isLoading && (
          <div className="glass practice-loading-card" role="status" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true" />
            <p className="loading-text">{loadingMessage}</p>
          </div>
        )}

        {/* Global Error Banner */}
        {!isLoading && errorMessage && (
          <div className="glass practice-error-card" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h2 className="error-title">Couldn't Load Learning Session</h2>
            <p className="error-description">{errorMessage}</p>
            <div className="error-action-row">
              <button
                type="button"
                id="session-try-again-button"
                onClick={loadSession}
                className="primary-button"
              >
                Try Again
              </button>
              <Link to="/curriculum" className="secondary-button return-to-curriculum-link">
                Return to Curriculum
              </Link>
            </div>
          </div>
        )}

        {/* Completion View */}
        {!isLoading && !errorMessage && stage === 'COMPLETED' && (
          <div className="glass completion-card-container" role="region" aria-label="Concept Completed">
            <div className="completion-badge-circle" aria-hidden="true">
              ✓
            </div>
            <h1 className="completion-title">Concept Complete</h1>
            <p className="completion-message">
              You successfully applied <strong>{conceptTitle}</strong> to a new problem scenario.
            </p>
            <div className="completion-actions-group">
              <Link
                to="/curriculum"
                id="continue-learning-button"
                className="primary-button completion-continue-btn"
              >
                Continue Learning →
              </Link>
              <Link
                to={`/curriculum/${conceptSlug}/practice`}
                className="secondary-button completion-practice-again-btn"
              >
                Practice Again
              </Link>
            </div>
          </div>
        )}

        {/* Two-Column Adaptive Learning Layout */}
        {!isLoading && !errorMessage && stage !== 'COMPLETED' && (
          <div className="two-column-learning-grid">
            {/* Left Column: Learning Action Card */}
            <section className="learning-card-column" aria-label="Learning Stage and Questions">
              {/* STAGE: TEACHING */}
              {stage === 'TEACHING' && (
                <div className="glass learning-focus-card">
                  <div className="learning-card-header">
                    <span className="phase-pill-badge teaching-pill-badge">TEACHING</span>
                    <span className="question-counter-badge">Step 1 of 3</span>
                  </div>

                  <h2 className="learning-focus-title">Let's Review the Core Idea</h2>
                  <p className="learning-focus-desc">
                    You encountered a misconception during practice. Read the tutor explanation and key
                    hint on the right, then continue to test your understanding on a new problem.
                  </p>

                  {session?.originalQuestion && (
                    <div className="original-question-context-box">
                      <span className="context-box-label">Practice Question Context</span>
                      <p className="context-prompt-text">{session.originalQuestion.prompt}</p>
                    </div>
                  )}

                  <div className="learning-card-actions">
                    <button
                      type="button"
                      id="teaching-continue-button"
                      onClick={handleContinueToRetry}
                      disabled={isAdvancing}
                      className="primary-button"
                    >
                      {isAdvancing ? (
                        <span className="submit-spinner-container">
                          <span className="submit-spinner" aria-hidden="true" />
                          <span>Preparing Retry Question...</span>
                        </span>
                      ) : (
                        <span>Continue to Retry Question →</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE: RETRY */}
              {(stage === 'RETRY_READY' ||
                stage === 'RETRY_SUBMITTING' ||
                stage === 'RETRY_CORRECT' ||
                stage === 'RETRY_WRONG') &&
                activeQuestion && (
                  <RetryPanel
                    question={activeQuestion}
                    onSubmit={handleSubmitRetry}
                    onContinueToTransfer={handleContinueToTransfer}
                    onContinueToReteach={handleContinueToReteach}
                    isSubmitting={isSubmitting}
                    result={submitResult}
                    errorMessage={submitError}
                  />
                )}

              {/* STAGE: TRANSFER */}
              {(stage === 'TRANSFER_READY' ||
                stage === 'TRANSFER_SUBMITTING' ||
                stage === 'TRANSFER_PASS' ||
                stage === 'TRANSFER_FAIL') &&
                activeQuestion && (
                  <TransferPanel
                    question={activeQuestion}
                    onSubmit={handleSubmitTransfer}
                    onComplete={handleViewCompletion}
                    onContinueToReteach={handleContinueToReteach}
                    isSubmitting={isSubmitting}
                    result={submitResult}
                    errorMessage={submitError}
                  />
                )}

              {/* STAGE: RETEACHING */}
              {stage === 'RETEACHING' && (
                <div className="glass learning-focus-card reteaching-card">
                  <div className="learning-card-header">
                    <span className="phase-pill-badge reteach-pill-badge">RETEACHING</span>
                    <span className="question-counter-badge">Alternative Perspective</span>
                  </div>

                  <h2 className="learning-focus-title">Approaching From Another Angle</h2>
                  <p className="learning-focus-desc">
                    Your previous attempt indicated a misunderstanding. Read the updated guidance from
                    the FIXXY Tutor on the right to build intuition, then try again.
                  </p>

                  <div className="learning-card-actions">
                    <button
                      type="button"
                      id="reteach-continue-button"
                      onClick={handleContinueFromReteach}
                      disabled={isAdvancing}
                      className="primary-button"
                    >
                      {isAdvancing ? (
                        <span className="submit-spinner-container">
                          <span className="submit-spinner" aria-hidden="true" />
                          <span>Preparing Question...</span>
                        </span>
                      ) : (
                        <span>Try Question Again →</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Right Column: FIXXY Tutor Panel */}
            <aside className="tutor-card-column" aria-label="FIXXY Tutor Insights">
              {teachingData && (
                <TeachingPanel
                  teaching={teachingData}
                  isReteach={stage === 'RETEACHING'}
                  onContinueToRetry={stage === 'TEACHING' ? handleContinueToRetry : undefined}
                  isContinuing={isAdvancing}
                />
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
