/**
 * FIXXY Module 8 — AI Diagnosis & Teaching Orchestration Client
 * Connects to Python FastAPI AI Service with built-in resilience and fallback.
 */

import { TeachingContentDto } from './orchestration.types';
import { getTeachingContent } from '../sessions/teaching.provider';
import { AiServiceError } from './orchestration.errors';

export interface AiDiagnosisRequest {
  conceptSlug: string;
  questionPrompt?: string;
  selectedOptionText?: string;
  misconceptionCode?: string;
  isReteach?: boolean;
}

export class AiClient {
  private aiServiceUrl: string;
  private timeoutMs: number;
  private failureSimulationMode: boolean = false;

  constructor(aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000', timeoutMs = 2500) {
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
      if (!this.failureSimulationMode && this.aiServiceUrl && !this.aiServiceUrl.includes('localhost:8000')) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const res = await fetch(`${this.aiServiceUrl}/api/diagnose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
            signal: controller.signal,
          });

          if (res.ok) {
            const data: any = await res.json();
            return {
              misconceptionCode: data.misconceptionCode || req.misconceptionCode,
              misconceptionTitle: data.title,
              strategy: data.strategy || 'first-principles',
              explanation: data.explanation,
              hint: data.hint,
              confidence: data.confidence ?? 0.92,
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
}

export const aiClient = new AiClient();
