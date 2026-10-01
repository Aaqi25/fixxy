import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getQuestionsForConcept, startLearningSession } from './api';
import type { PracticeQuestion, AttemptResult } from './answer-submission.types';
import { QuestionCard } from './QuestionCard';

export const PracticePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedAttempts, setCompletedAttempts] = useState<AttemptResult[]>([]);

  const loadPracticeSession = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fetchedQuestions = await getQuestionsForConcept(slug);
      if (fetchedQuestions.length === 0) {
        setErrorMessage(`No practice questions found for "${slug}".`);
        setIsLoading(false);
        return;
      }

      setQuestions(fetchedQuestions);

      // Start or resume session for this concept
      try {
        const session = await startLearningSession(fetchedQuestions[0].conceptId);
        setSessionId(session.id);
      } catch {
        // Standalone practice mode if session creation fails
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't load practice questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadPracticeSession();
  }, [loadPracticeSession]);

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleAnswerRecorded = (result: AttemptResult) => {
    setCompletedAttempts((prev) => [...prev, result]);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const currentQuestion = questions[currentIndex];
  const conceptTitle = currentQuestion?.conceptTitle || slug?.replace(/-/g, ' ') || 'Concept';

  return (
    <div className="fixxy-page practice-page-container" style={{ minHeight: '100vh' }}>
      {/* Top Glass Navigation Bar */}
      <header className="glass top-nav-bar" role="banner">
        <div className="nav-brand-group">
          <Link to="/curriculum" className="brand-logo-link" aria-label="FIXXY Curriculum Home">
            <span className="brand-fixxy-gradient">FIXXY</span>
            <span className="brand-module-tag">Practice</span>
          </Link>
          <span className="breadcrumb-divider">/</span>
          <Link to={`/curriculum/${slug}`} className="breadcrumb-concept-link">
            {conceptTitle}
          </Link>
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

      {/* Main Content Area */}
      <main className="practice-main-content" role="main">
        <div className="practice-header-section">
          <Link
            to={`/curriculum/${slug}`}
            id="back-to-concept-link"
            className="back-nav-link"
            aria-label="Back to concept details"
          >
            ← Back to {conceptTitle}
          </Link>

          <h1 className="practice-title">Practice: {conceptTitle}</h1>
          <p className="practice-subtitle">
            Answer the practice questions below to test your understanding.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="glass practice-loading-card" role="status" aria-live="polite">
            <div className="loading-spinner" aria-hidden="true" />
            <p className="loading-text">Loading practice questions...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="glass practice-error-card" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h2 className="error-title">Couldn't Load Questions</h2>
            <p className="error-description">{errorMessage}</p>
            <button
              type="button"
              id="retry-questions-button"
              onClick={loadPracticeSession}
              className="primary-button"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Question Practice Interface */}
        {!isLoading && !errorMessage && currentQuestion && (
          <div className="practice-card-container">
            <QuestionCard
              question={currentQuestion}
              sessionId={sessionId}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              onAnswerSubmitted={handleAnswerRecorded}
              onNextQuestion={handleNextQuestion}
              hasNextQuestion={currentIndex < questions.length - 1}
            />

            {/* Session Progress Tracker */}
            <div className="glass practice-progress-surface" aria-label="Practice progress">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-fraction">
                  {currentIndex + 1} of {questions.length} Questions ({completedAttempts.length} answered)
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
