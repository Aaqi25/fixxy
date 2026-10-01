import type { ApiErrorResponse, SafeStudentDto } from './auth.types';

const API_BASE = '/api';

/**
 * Generic fetch wrapper that handles credentials/cookies and error parsing.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorBody: ApiErrorResponse = { message: 'An unexpected error occurred. Please try again.' };
    try {
      errorBody = await res.json();
    } catch {
      // Use default error message if JSON parsing fails
    }

    const err = new Error(errorBody.message) as Error & {
      status: number;
      errors?: Record<string, string>;
    };
    err.status = res.status;
    err.errors = errorBody.errors;
    throw err;
  }

  return res.json() as Promise<T>;
}

/**
 * POST /api/auth/register
 */
export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ message: string; student: SafeStudentDto }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * POST /api/auth/login
 */
export async function login(
  email: string,
  password: string
): Promise<{ message: string; student: SafeStudentDto }> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * GET /api/auth/me — Restore authenticated student from HttpOnly cookie.
 * Returns null if not authenticated (401) rather than throwing.
 */
export async function getCurrentStudent(): Promise<SafeStudentDto | null> {
  try {
    const data = await apiFetch<{ student: SafeStudentDto }>('/auth/me');
    return data.student;
  } catch (err: any) {
    if (err.status === 401) {
      return null; // Not authenticated — expected state
    }
    throw err; // Unexpected error
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(): Promise<{ message: string }> {
  return apiFetch('/auth/logout', { method: 'POST' });
}
