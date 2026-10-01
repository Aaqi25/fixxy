import type {
  ApiConceptDetailResponse,
  ApiConceptsResponse,
  ApiLearningPathResponse,
  ConceptDetail,
  ConceptSummary,
  LearningPathNode,
} from './curriculum.types';

const API_BASE = '/api';

export interface CurriculumApiError {
  message: string;
  status: number;
}

async function curriculumFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
        // Response was not JSON
      }

      const error: CurriculumApiError = {
        message: body.message || (res.status === 404 ? 'Concept not found' : "Couldn't load curriculum. Please try again."),
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
    const netError: CurriculumApiError = {
      message: "Couldn't connect to FIXXY. Please check your connection and try again.",
      status: 0,
    };
    throw netError;
  }
}

/**
 * GET /api/curriculum/concepts
 */
export async function getConcepts(): Promise<ConceptSummary[]> {
  const data = await curriculumFetch<ApiConceptsResponse>('/curriculum/concepts', {
    method: 'GET',
  });
  return data.concepts;
}

/**
 * GET /api/curriculum/concepts/:slug
 */
export async function getConceptBySlug(slug: string): Promise<ConceptDetail> {
  const data = await curriculumFetch<ApiConceptDetailResponse>(
    `/curriculum/concepts/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
    }
  );
  return data.concept;
}

/**
 * GET /api/curriculum/path
 */
export async function getLearningPath(): Promise<LearningPathNode[]> {
  const data = await curriculumFetch<ApiLearningPathResponse>('/curriculum/path', {
    method: 'GET',
  });
  return data.path;
}
