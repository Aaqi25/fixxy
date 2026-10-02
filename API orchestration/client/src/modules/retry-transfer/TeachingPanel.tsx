import React, { useState, useRef, useEffect } from 'react';
import type { TeachingResponse } from './retry-transfer.types';
import { formatStrategyLabel } from './retry-transfer.utils';
import { sendTutorChatMessage, type TutorChatMessage } from './api';

interface TeachingPanelProps {
  teaching: TeachingResponse;
  onContinueToRetry?: () => void;
  continueLabel?: string;
  isContinuing?: boolean;
  isReteach?: boolean;
  concept?: string;
  conceptSlug?: string;
  questionPrompt?: string;
  studentAnswerText?: string;
  correctAnswerText?: string;
  mastery?: number | null;
}

export const TeachingPanel: React.FC<TeachingPanelProps> = ({
  teaching,
  onContinueToRetry,
  continueLabel = 'Continue to Retry Question →',
  isContinuing = false,
  isReteach = false,
  concept,
  conceptSlug,
  questionPrompt,
  studentAnswerText,
  correctAnswerText,
  mastery,
}) => {
  const strategyFormatted = formatStrategyLabel(teaching.strategy);
  const activeConcept = concept || conceptSlug || 'Machine Learning';

  // Interactive conversation state
  const [messages, setMessages] = useState<TutorChatMessage[]>([
    {
      role: 'tutor',
      content: teaching.explanation,
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial explanation when teaching response updates (e.g. during reteaching)
  useEffect(() => {
    if (teaching.explanation) {
      setMessages((prev) => {
        // If empty or only had prior initial message, replace with fresh explanation
        if (prev.length <= 1) {
          return [{ role: 'tutor', content: teaching.explanation }];
        }
        return prev;
      });
    }
  }, [teaching.explanation]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle message send
  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isThinking) return;

    const userMessage: TutorChatMessage = {
      role: 'user',
      content: trimmed,
    };

    const nextConversation = [...messages, userMessage];
    setMessages(nextConversation);
    setInputMessage('');
    setIsThinking(true);
    setChatError(null);

    try {
      const res = await sendTutorChatMessage({
        concept: activeConcept,
        question: questionPrompt,
        correctAnswer: correctAnswerText,
        studentAnswer: studentAnswerText,
        misconceptionId: teaching.misconceptionCode || teaching.misconceptionId,
        strategy: teaching.strategy,
        mastery: mastery ?? null,
        conversation: nextConversation,
        message: trimmed,
      });

      const tutorMessage: TutorChatMessage = {
        role: 'tutor',
        content: res.response || "Here to help you understand! What else would you like to explore?",
      };

      setMessages((prev) => [...prev, tutorMessage]);
    } catch {
      setChatError("FIXXY couldn't respond right now. Please try again.");
    } finally {
      setIsThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Keyboard shortcut: Enter sends, Shift+Enter creates newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className="glass teaching-panel-card"
      role="region"
      aria-label="FIXXY Tutor Teaching Response"
      id="teaching-panel"
    >
      {/* Header with FIXXY Tutor Brand Badge */}
      <div className="teaching-header">
        <div className="tutor-badge-group">
          <div className="tutor-avatar-icon" aria-hidden="true">
            🤖
          </div>
          <div>
            <span className="tutor-brand-label">FIXXY TUTOR</span>
            <h2 className="teaching-heading">
              {isReteach ? "Let's approach this from another angle." : "Let's understand what happened."}
            </h2>
          </div>
        </div>

        {teaching.strategy && (
          <span className="strategy-tag-badge" aria-label={`Teaching Strategy: ${strategyFormatted}`}>
            {strategyFormatted}
          </span>
        )}
      </div>

      {/* Misconception Diagnosis Box */}
      {teaching.misconceptionTitle && (
        <div className="misconception-diagnosis-box" role="status">
          <div className="diagnosis-label-row">
            <span className="diagnosis-icon" aria-hidden="true">
              🎯
            </span>
            <span className="diagnosis-header-text">Diagnosed Misconception</span>
            {teaching.misconceptionCode && (
              <span className="misconception-code-pill">{teaching.misconceptionCode}</span>
            )}
          </div>
          <p className="diagnosis-title-text">{teaching.misconceptionTitle}</p>
        </div>
      )}

      {/* Interactive Tutor Conversation Section */}
      <div className="explanation-section" aria-label="Tutor Conversation">
        <div className="chat-section-header">
          <span className="section-small-label">Personalized Conversation</span>
          <span className="tutor-live-badge">Adaptive AI Tutor</span>
        </div>

        {/* Scrollable Conversation Thread */}
        <div
          className="tutor-chat-thread"
          role="log"
          aria-live="polite"
          aria-label="Conversation with FIXXY Tutor"
        >
          {messages.map((msg, idx) => {
            const isTutor = msg.role === 'tutor';
            return (
              <div
                key={idx}
                className={`tutor-chat-message-row ${isTutor ? 'tutor-row' : 'user-row'}`}
              >
                <div
                  className={`chat-avatar ${isTutor ? 'tutor-chat-avatar' : 'user-chat-avatar'}`}
                  aria-hidden="true"
                >
                  {isTutor ? '🤖' : '👤'}
                </div>

                <div className="chat-bubble-container">
                  <span className="chat-sender-name">
                    {isTutor ? (idx === 0 ? 'FIXXY Tutor (Initial Explanation)' : 'FIXXY Tutor') : 'You'}
                  </span>
                  <div className={`chat-bubble ${isTutor ? 'tutor-bubble' : 'user-bubble'}`}>
                    <p className="chat-bubble-text">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking / Loading Indicator */}
          {isThinking && (
            <div className="tutor-chat-message-row tutor-row">
              <div className="chat-avatar tutor-chat-avatar" aria-hidden="true">
                🤖
              </div>
              <div className="chat-bubble-container">
                <span className="chat-sender-name">FIXXY Tutor</span>
                <div className="chat-bubble tutor-bubble thinking-bubble" role="status" aria-live="polite">
                  <span className="thinking-text">FIXXY is thinking</span>
                  <span className="thinking-dots">
                    <span className="dot dot-1">.</span>
                    <span className="dot dot-2">.</span>
                    <span className="dot dot-3">.</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Friendly Error Display */}
        {chatError && (
          <div className="chat-error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <span>{chatError}</span>
          </div>
        )}

        {/* Chat Input Area */}
        <div className="tutor-chat-input-bar">
          <textarea
            ref={inputRef}
            id="tutor-chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FIXXY anything about this concept..."
            aria-label="Ask FIXXY tutor a question"
            disabled={isThinking}
            rows={2}
            className="tutor-chat-textarea"
          />
          <button
            type="button"
            id="send-tutor-message-btn"
            onClick={handleSendMessage}
            disabled={isThinking || !inputMessage.trim()}
            className="tutor-send-btn"
            aria-label="Send message to FIXXY Tutor"
          >
            {isThinking ? (
              <span className="send-spinner" aria-hidden="true" />
            ) : (
              <span>Send ↵</span>
            )}
          </button>
        </div>
      </div>

      {/* Actionable Hint Box */}
      {teaching.hint && (
        <div className="hint-section" role="note" aria-label="Tutor Hint">
          <div className="hint-label-row">
            <span className="hint-icon" aria-hidden="true">
              💡
            </span>
            <span className="hint-header-text">Key Hint</span>
          </div>
          <p className="hint-text">{teaching.hint}</p>
        </div>
      )}

      {/* Continue Action */}
      {onContinueToRetry && (
        <div className="teaching-actions-footer">
          <button
            type="button"
            onClick={onContinueToRetry}
            disabled={isContinuing}
            id="continue-to-retry-btn"
            className="primary-button continue-to-retry-btn"
            aria-label={continueLabel}
          >
            {isContinuing ? (
              <span className="submit-spinner-container">
                <span className="submit-spinner" aria-hidden="true" />
                <span>Loading Question...</span>
              </span>
            ) : (
              <span>{continueLabel}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
