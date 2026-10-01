/**
 * Module 7: Mastery Dashboard API Client
 */

import type {
  OverallMasteryResponse,
  ConceptsMasteryResponse,
  RecentActivityResponse,
  LearningInsightsResponse,
  MasterySummaryDto,
  ConceptMasteryDto,
  RecentActivityItemDto,
  LearningInsightDto,
} from './mastery.types';

const API_BASE = '/api';

export interface MasteryApiError {
  message: string;
  status: number;
}

async function masteryFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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

      const error: MasteryApiError = {
        message: body.message || "Couldn't load your learning progress. Please try again.",
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
    const netError: MasteryApiError = {
      message: "Couldn't connect to FIXXY. Please check your connection and try again.",
      status: 0,
    };
    throw netError;
  }
}

/**
 * GET /api/mastery — Retrieve overall learning summary
 */
export async function getOverallMastery(): Promise<MasterySummaryDto> {
  const data = await masteryFetch<OverallMasteryResponse>('/mastery', {
    method: 'GET',
  });
  return data.summary;
}

/**
 * GET /api/mastery/concepts — Retrieve concept-level mastery
 */
export async function getConceptMasteries(): Promise<ConceptMasteryDto[]> {
  const data = await masteryFetch<ConceptsMasteryResponse>('/mastery/concepts', {
    method: 'GET',
  });
  return data.concepts;
}

/**
 * GET /api/mastery/activity — Retrieve recent learning activity
 */
export async function getRecentActivity(limit = 10): Promise<RecentActivityItemDto[]> {
  const data = await masteryFetch<RecentActivityResponse>(`/mastery/activity?limit=${limit}`, {
    method: 'GET',
  });
  return data.activity;
}

/**
 * GET /api/mastery/insights — Retrieve deterministic learning insights
 */
export async function getLearningInsights(): Promise<LearningInsightDto[]> {
  const data = await masteryFetch<LearningInsightsResponse>('/mastery/insights', {
    method: 'GET',
  });
  return data.insights;
}
