/**
 * FIXXY Module 8 — AI Diagnosis & Teaching Orchestration Client
 * Connects to Python FastAPI AI Service with built-in resilience and fallback.
 */

import { TeachingContentDto } from './orchestration.types';
import { getTeachingContent } from '../sessions/teaching.provider';
import { AiServiceError } from './orchestration.errors';
import { env } from '../../config/env';

export interface AiDiagnosisRequest {
  conceptSlug: string;
  questionPrompt?: string;
  selectedOptionText?: string;
  correctAnswerText?: string;
  misconceptionCode?: string;
  isReteach?: boolean;
  studentId?: string;
  mastery?: number | null;
  strategyScores?: Record<string, number>;
}

export class AiClient {
  private aiServiceUrl: string;
  private timeoutMs: number;
  private failureSimulationMode: boolean = false;

  constructor(aiServiceUrl = env.aiServiceUrl, timeoutMs = 15000) {
    this.aiServiceUrl = aiServiceUrl;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Set simulated failure for resilience testing.
   */
  public setSimulateFailure(enabled: boolean): void {
    this.failureSimulationMode = enabled;
  }

  /**
   * Request misconception diagnosis and personalized teaching.
   * If the external AI service fails, fallback to expert knowledge base so the student flow remains uninterrupted.
   * If throwOnFailure is true (e.g. during specific resilience verification), it raises AiServiceError.
   */
  async getDiagnosisAndTeaching(
    req: AiDiagnosisRequest,
    options?: { throwOnFailure?: boolean }
  ): Promise<TeachingContentDto> {
    if (this.failureSimulationMode) {
      if (options?.throwOnFailure) {
        throw new AiServiceError('AI service simulation failure: Service unavailable');
      }
    }

    try {
      if (!this.failureSimulationMode && this.aiServiceUrl) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          // Send request to FastAPI intervention pipeline (/ai/intervene)
          const payload = {
            concept: req.conceptSlug || 'general',
            question: req.questionPrompt || 'Multiple choice question',
            correct_answer: req.correctAnswerText || 'The model has overfit the training data and failed to generalize.',
            student_answer: req.selectedOptionText || 'Incorrect option chosen',
            student_context: {
              mastery: req.mastery ?? null,
              strategy_scores: req.strategyScores || {},
            },
          };

          const res = await fetch(`${this.aiServiceUrl}/ai/intervene`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (res.ok) {
            const data: any = await res.json();
            return {
              misconceptionCode: data.misconception_id || req.misconceptionCode || 'M1',
              misconceptionId: data.misconception_id,
              misconceptionTitle: data.misconception_id ? `Misconception ${data.misconception_id}` : undefined,
              strategy: data.strategy || 'analogy',
              explanation: data.explanation || (data.opening_message ? `${data.opening_message}\n\n${data.explanation}` : ''),
              hint: data.hint || data.retry_instruction || '',
              confidence: data.confidence ?? 0.95,
              isReteach: Boolean(req.isReteach),
            };
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch (err: any) {
      if (options?.throwOnFailure) {
        throw new AiServiceError('AI Diagnosis service connection timed out or failed', err?.message);
      }
    }

    // High-confidence expert knowledge base fallback
    const fallback = getTeachingContent(req.conceptSlug, req.misconceptionCode, req.isReteach);
    return {
      misconceptionCode: fallback.misconceptionCode,
      misconceptionTitle: fallback.misconceptionTitle,
      strategy: fallback.strategy,
      explanation: fallback.explanation,
      hint: fallback.hint,
      confidence: 0.95,
      isReteach: fallback.isReteach,
    };
  }

  /**
   * Interactive multi-turn chat with FIXXY Tutor.
   * Sends student message, session context, and conversation history to FastAPI AI service.
   */
  async chatWithTutor(req: TutorChatPayload): Promise<TutorChatResult> {
    try {
      if (!this.failureSimulationMode && this.aiServiceUrl) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const payload = {
            concept: req.concept || 'general',
            question: req.question || '',
            correct_answer: req.correctAnswer || '',
            student_answer: req.studentAnswer || '',
            misconception_id: req.misconceptionId || '',
            strategy: req.strategy || 'analogy',
            mastery: req.mastery ?? null,
            conversation: req.conversation || [],
            message: req.message,
          };

          const res = await fetch(`${this.aiServiceUrl}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (res.ok) {
            const data: any = await res.json();
            return {
              response: data.response || "I'm here to help you understand this concept. What would you like to explore?",
              concept: data.concept || req.concept,
              misconceptionId: data.misconception_id || req.misconceptionId,
            };
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch (err: any) {
      // Graceful fallback below
    }

    // Contextual fallback response if AI service is temporarily unavailable
    return {
      response: `Remember that in ${req.concept}, the goal is for the model to generalize well to unseen test data, rather than simply memorizing the training set. How does that connect to what you observed?`,
      concept: req.concept,
      misconceptionId: req.misconceptionId,
    };
  }
}

export interface TutorChatPayload {
  concept: string;
  question?: string;
  correctAnswer?: string;
  studentAnswer?: string;
  misconceptionId?: string;
  strategy?: string;
  mastery?: number | null;
  conversation?: Array<{ role: string; content: string }>;
  message: string;
}

export interface TutorChatResult {
  response: string;
  concept: string;
  misconceptionId?: string;
}

export const aiClient = new AiClient();

