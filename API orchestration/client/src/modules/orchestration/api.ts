/**
 * FIXXY Module 8 — API Orchestration Client
 * Unified learning flow client that coordinates session progression.
 */

import type {
  CreateSessionResponse,
  SessionRestorationResponse,
  SubmitAnswerPayload,
  AnswerResponse,
} from './orchestration.types';

const API_BASE = '/api';

export interface OrchestrationApiError {
  message: string;
  status: number;
  code?: string;
  isNetworkError?: boolean;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      let body: any = {};
      try {
        body = await res.json();
      } catch {
        // non-JSON response
      }

      let fallback = 'Unable to complete learning action. Please try again.';
      if (res.status === 400) fallback = body.message || 'Invalid request.';
      else if (res.status === 401) fallback = 'Please log in to continue learning.';
      else if (res.status === 403) fallback = 'Unauthorized session access.';
      else if (res.status === 404) fallback = 'Learning session or question not found.';
      else if (res.status === 409) fallback = body.message || 'Duplicate request or conflicting session state.';
      else if (res.status === 503) fallback = 'AI diagnosis service is currently busy. Your answer is saved.';

      const error: OrchestrationApiError = {
        message: body.message || fallback,
        code: body.code || body.error?.code,
        status: res.status,
      };
      throw error;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err.status !== undefined) {
      throw err;
    }

    const netErr: OrchestrationApiError = {
      message: "Couldn't connect to FIXXY. Please check your network and try again.",
      status: 0,
      isNetworkError: true,
    };
    throw netErr;
  }
}

/**
 * Start or retrieve active session for a concept.
 * POST /api/learning/sessions
 */
export async function startLearningSession(conceptSlug: string): Promise<CreateSessionResponse> {
  return apiFetch<CreateSessionResponse>('/learning/sessions', {
    method: 'POST',
    body: JSON.stringify({ conceptSlug }),
  });
}

/**
 * Restore learning session state on refresh.
 * GET /api/learning/sessions/:sessionId
 */
export async function getLearningSession(sessionId: string): Promise<SessionRestorationResponse> {
  return apiFetch<SessionRestorationResponse>(`/learning/sessions/${encodeURIComponent(sessionId)}`);
}

/**
 * Submit answer through the unified orchestration pipeline.
 * POST /api/learning/answer
 */
export async function submitLearningAnswer(payload: SubmitAnswerPayload): Promise<AnswerResponse> {
  return apiFetch<AnswerResponse>('/learning/answer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Advance learning session stage (e.g. from Teaching to Retry).
 * POST /api/learning/sessions/:sessionId/advance
 */
export async function advanceLearningSession(
  sessionId: string,
  targetStage?: 'RETRY' | 'TRANSFER'
): Promise<SessionRestorationResponse> {
  return apiFetch<SessionRestorationResponse>(`/learning/sessions/${encodeURIComponent(sessionId)}/advance`, {
    method: 'POST',
    body: JSON.stringify({ targetStage }),
  });
}
