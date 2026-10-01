import type {
  PracticeQuestion,
  SubmitAttemptPayload,
  AttemptResult,
} from './answer-submission.types';

const API_BASE = '/api';

export interface AnswerSubmissionApiError {
  message: string;
  status: number;
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
        // Non-JSON response
      }

      let fallbackMessage = "Couldn't submit your answer. Please try again.";
      if (res.status === 400) fallbackMessage = body.message || 'Invalid answer submission.';
      else if (res.status === 401) fallbackMessage = 'Please log in to submit your answer.';
      else if (res.status === 403) fallbackMessage = 'Unauthorized session access.';
      else if (res.status === 404) fallbackMessage = 'Question or option not found.';
      else if (res.status === 409) fallbackMessage = 'Duplicate submission detected. Please wait before trying again.';

      const error: AnswerSubmissionApiError = {
        message: body.message || fallbackMessage,
        status: res.status,
      };
      throw error;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err.status !== undefined) {
      throw err;
    }

    // Network / connection error
    const netError: AnswerSubmissionApiError = {
      message: "Couldn't connect to FIXXY. Please try again.",
      status: 0,
      isNetworkError: true,
    };
    throw netError;
  }
}

/**
 * Submit an answer to POST /api/attempts.
 * Correctness is verified and recorded server-side.
 */
export async function submitAnswer(payload: SubmitAttemptPayload): Promise<AttemptResult> {
  return apiFetch<AttemptResult>('/attempts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch questions for a concept (Safe DTO without answer keys).
 */
export async function getQuestionsForConcept(slug: string): Promise<PracticeQuestion[]> {
  const res = await apiFetch<{ questions: PracticeQuestion[] }>(`/questions/concept/${encodeURIComponent(slug)}`);
  return res.questions;
}

/**
 * Start or resume a learning session for the authenticated student and concept.
 */
export async function startLearningSession(conceptId: string): Promise<{ id: string }> {
  const res = await apiFetch<{ session: { id: string } }>('/questions/session', {
    method: 'POST',
    body: JSON.stringify({ conceptId }),
  });
  return res.session;
}
