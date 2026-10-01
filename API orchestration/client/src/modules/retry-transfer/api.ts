import type {
  RetryTransferSessionData,
  SessionStateApiResponse,
  SubmitRetryTransferPayload,
  SubmitRetryTransferApiResponse,
} from './retry-transfer.types';

const API_BASE = '/api';

export interface RetryTransferApiError {
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
        // Fallback for non-JSON
      }

      let fallbackMessage = "Couldn't load your tutoring response. Please try again.";
      if (res.status === 400) fallbackMessage = body.message || 'Invalid request.';
      else if (res.status === 401) fallbackMessage = 'Please log in to continue learning.';
      else if (res.status === 403) fallbackMessage = 'Unauthorized learning session access.';
      else if (res.status === 404) fallbackMessage = 'Your learning session could not be restored.';
      else if (res.status === 409) fallbackMessage = 'Duplicate submission detected. Please wait a moment.';

      const error: RetryTransferApiError = {
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

    const netError: RetryTransferApiError = {
      message: "Couldn't connect to FIXXY. Please check your connection and try again.",
      status: 0,
      isNetworkError: true,
    };
    throw netError;
  }
}

/**
 * Fetch current learning session by ID (restores stage on refresh).
 */
export async function getSessionById(sessionId: string): Promise<RetryTransferSessionData> {
  const data = await apiFetch<SessionStateApiResponse>(`/sessions/${encodeURIComponent(sessionId)}`);
  return data.session;
}

/**
 * Fetch or restore active session by concept slug.
 */
export async function getSessionByConcept(conceptSlug: string): Promise<RetryTransferSessionData> {
  const data = await apiFetch<SessionStateApiResponse>(`/sessions/concept/${encodeURIComponent(conceptSlug)}`);
  return data.session;
}

/**
 * Advance session stage (e.g. Teaching -> Retry, or Reteaching -> Retry/Transfer).
 */
export async function advanceSessionStage(
  sessionId: string,
  targetStage?: 'RETRY' | 'TRANSFER'
): Promise<RetryTransferSessionData> {
  const data = await apiFetch<SessionStateApiResponse>(`/sessions/${encodeURIComponent(sessionId)}/advance`, {
    method: 'POST',
    body: JSON.stringify({ targetStage }),
  });
  return data.session;
}

/**
 * Submit answer for retry or transfer question (evaluates correctness via Module 5).
 */
export async function submitRetryOrTransferAnswer(
  payload: SubmitRetryTransferPayload
): Promise<SubmitRetryTransferApiResponse> {
  return apiFetch<SubmitRetryTransferApiResponse>('/attempts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
