import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startLearningSession,
  getLearningSession,
  submitLearningAnswer,
  advanceLearningSession,
} from '../modules/orchestration/api';

describe('Module 8: API Orchestration Client Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('startLearningSession sends POST /api/learning/sessions and returns session data', async () => {
    const mockResponse = {
      sessionId: 'sess-123',
      state: 'PRACTICE',
      stage: 'PRACTICE',
      concept: { id: 'c-1', slug: 'overfitting', title: 'Overfitting' },
      question: {
        id: 'q-1',
        conceptId: 'c-1',
        code: 'OVERFIT_Q1',
        phase: 'practice',
        prompt: 'What is overfitting?',
        difficulty: 1,
        options: [{ id: 'opt-1', position: 1, text: 'Memorizing noise' }],
      },
      history: [],
      isCompleted: false,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await startLearningSession('overfitting');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/learning/sessions',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ conceptSlug: 'overfitting' }),
      })
    );
    expect(result.sessionId).toBe('sess-123');
    expect(result.state).toBe('PRACTICE');
    expect(result.question?.code).toBe('OVERFIT_Q1');
  });

  it('getLearningSession sends GET /api/learning/sessions/:sessionId and restores state', async () => {
    const mockRestore = {
      sessionId: 'sess-123',
      state: 'RETRY',
      stage: 'RETRY',
      concept: { id: 'c-1', slug: 'overfitting', title: 'Overfitting' },
      question: { id: 'q-2', code: 'OVERFIT_Q2', prompt: 'Retry question', phase: 'retry', options: [] },
      originalQuestion: { id: 'q-1', code: 'OVERFIT_Q1', prompt: 'Original practice', phase: 'practice', options: [] },
      teaching: { strategy: 'analogy', explanation: 'Analogy explanation', hint: 'Think about test data' },
      history: [{ id: 'att-1', isCorrect: false }],
      isCompleted: false,
      allowedActions: ['SUBMIT_ANSWER'],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRestore,
    } as Response);

    const result = await getLearningSession('sess-123');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/learning/sessions/sess-123',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(result.state).toBe('RETRY');
    expect(result.teaching?.explanation).toBe('Analogy explanation');
    expect(result.history.length).toBe(1);
  });

  it('submitLearningAnswer sends POST /api/learning/answer and receives next state in single call', async () => {
    const mockAnswerRes = {
      sessionId: 'sess-123',
      state: 'TRANSFER',
      stage: 'TRANSFER',
      result: { isCorrect: true, attemptId: 'att-2' },
      teaching: null,
      nextQuestion: {
        id: 'q-3',
        code: 'OVERFIT_Q3',
        phase: 'transfer',
        prompt: 'Transfer question',
        options: [],
      },
      isCompleted: false,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnswerRes,
    } as Response);

    const result = await submitLearningAnswer({
      sessionId: 'sess-123',
      questionId: 'q-2',
      selectedOptionId: 'opt-right',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/learning/answer',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          sessionId: 'sess-123',
          questionId: 'q-2',
          selectedOptionId: 'opt-right',
        }),
      })
    );
    expect(result.result.isCorrect).toBe(true);
    expect(result.state).toBe('TRANSFER');
    expect(result.nextQuestion?.code).toBe('OVERFIT_Q3');
  });

  it('advanceLearningSession sends POST /api/learning/sessions/:sessionId/advance', async () => {
    const mockAdv = {
      sessionId: 'sess-123',
      state: 'RETRY',
      stage: 'RETRY',
      concept: { id: 'c-1', slug: 'overfitting', title: 'Overfitting' },
      history: [],
      isCompleted: false,
      allowedActions: ['SUBMIT_ANSWER'],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockAdv,
    } as Response);

    const result = await advanceLearningSession('sess-123', 'RETRY');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/learning/sessions/sess-123/advance',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ targetStage: 'RETRY' }),
      })
    );
    expect(result.state).toBe('RETRY');
  });

  it('handles 401 Unauthorized correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Authentication required' }),
    } as Response);

    await expect(startLearningSession('overfitting')).rejects.toMatchObject({
      status: 401,
      message: 'Authentication required',
    });
  });

  it('handles 403 Forbidden correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Unauthorized session access.' }),
    } as Response);

    await expect(getLearningSession('sess-other')).rejects.toMatchObject({
      status: 403,
      message: 'Unauthorized session access.',
    });
  });

  it('handles 409 Conflict (duplicate submission) correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Duplicate submission detected. Please wait before submitting again.' }),
    } as Response);

    await expect(
      submitLearningAnswer({
        sessionId: 'sess-1',
        questionId: 'q-1',
        selectedOptionId: 'opt-1',
      })
    ).rejects.toMatchObject({
      status: 409,
      message: 'Duplicate submission detected. Please wait before submitting again.',
    });
  });

  it('handles 503 AI Service Unavailable gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ message: 'AI Diagnosis service is temporarily unavailable' }),
    } as Response);

    await expect(
      submitLearningAnswer({
        sessionId: 'sess-1',
        questionId: 'q-1',
        selectedOptionId: 'opt-wrong',
      })
    ).rejects.toMatchObject({
      status: 503,
      message: 'AI Diagnosis service is temporarily unavailable',
    });
  });
});
