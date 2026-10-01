import type { QuestionResponse, StudentQuestion } from './question.types';

const API_BASE = '/api';

/**
 * Handle HTTP response and parse errors
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || errorMsg;
    } catch {
      // Ignore JSON parse errors for fallback
    }
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Start a learning session or retrieve active question for a concept
 */
export async function startLearningSession(conceptSlug: string): Promise<QuestionResponse> {
  const res = await fetch(`${API_BASE}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ conceptSlug }),
  });
  return handleResponse<QuestionResponse>(res);
}

/**
 * Fetch a practice question for a concept
 */
export async function fetchPracticeQuestion(conceptSlug: string): Promise<QuestionResponse> {
  const res = await fetch(`${API_BASE}/questions/practice/${encodeURIComponent(conceptSlug)}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<QuestionResponse>(res);
}

/**
 * Fetch a retry question for an active session
 */
export async function fetchRetryQuestion(sessionId: string): Promise<QuestionResponse> {
  const res = await fetch(`${API_BASE}/questions/retry/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<QuestionResponse>(res);
}

/**
 * Fetch a transfer question for an active session
 */
export async function fetchTransferQuestion(sessionId: string): Promise<QuestionResponse> {
  const res = await fetch(`${API_BASE}/questions/transfer/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<QuestionResponse>(res);
}

/**
 * Fetch the current active question for a session (used during refresh or session resumption)
 */
export async function fetchCurrentSessionQuestion(sessionId: string): Promise<QuestionResponse> {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/questions/current`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<QuestionResponse>(res);
}

/**
 * Fetch question by ID
 */
export async function fetchQuestionById(questionId: string): Promise<{ question: StudentQuestion }> {
  const res = await fetch(`${API_BASE}/questions/${encodeURIComponent(questionId)}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<{ question: StudentQuestion }>(res);
}
