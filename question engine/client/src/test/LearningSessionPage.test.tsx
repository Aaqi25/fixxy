import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningSessionPage } from '../modules/questions/LearningSessionPage';
import * as questionsApi from '../modules/questions/api';
import * as AuthContext from '../modules/auth/AuthContext';

// Mock API
vi.mock('../modules/questions/api', () => ({
  startLearningSession: vi.fn(),
  fetchRetryQuestion: vi.fn(),
  fetchTransferQuestion: vi.fn(),
}));

const mockStudent = {
  id: 'student-123',
  name: 'Ada Lovelace',
  email: 'ada@fixxy.edu',
  isEmailVerified: true,
  createdAt: '2026-01-01',
};

const mockQuestionResponse = {
  question: {
    id: 'q-overfit-practice',
    conceptId: 'c-overfit',
    conceptSlug: 'overfitting',
    conceptTitle: 'Overfitting',
    stage: 'PRACTICE' as const,
    difficulty: 'BEGINNER' as const,
    text: 'What is the primary indicator of overfitting?',
    options: [
      { id: 'opt-1', text: 'High training accuracy, poor validation accuracy', displayOrder: 1 },
      { id: 'opt-2', text: 'Low training accuracy, low validation accuracy', displayOrder: 2 },
      { id: 'opt-3', text: 'Uniform error across all datasets', displayOrder: 3 },
      { id: 'opt-4', text: 'Zero parameters in hypothesis', displayOrder: 4 },
    ],
  },
  session: {
    id: 'sess-123',
    studentId: 'student-123',
    conceptId: 'c-overfit',
    conceptSlug: 'overfitting',
    conceptTitle: 'Overfitting',
    currentStage: 'PRACTICE',
    status: 'ACTIVE' as const,
    currentQuestionId: 'q-overfit-practice',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
};

describe('LearningSessionPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      student: mockStudent,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      clearError: vi.fn(),
    });
  });

  it('renders loading state initially while fetching question', () => {
    vi.mocked(questionsApi.startLearningSession).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/learn/overfitting']}>
        <Routes>
          <Route path="/learn/:conceptSlug" element={<LearningSessionPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading question...')).toBeInTheDocument();
  });

  it('renders question, options, and stage badge when loaded successfully', async () => {
    vi.mocked(questionsApi.startLearningSession).mockResolvedValue(mockQuestionResponse);

    render(
      <MemoryRouter initialEntries={['/learn/overfitting']}>
        <Routes>
          <Route path="/learn/:conceptSlug" element={<LearningSessionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('What is the primary indicator of overfitting?')).toBeInTheDocument();
    });

    expect(screen.getByText('Practice Question')).toBeInTheDocument();
    expect(screen.getByText('High training accuracy, poor validation accuracy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeInTheDocument();
  });

  it('displays error message and allows retry when question fetch fails', async () => {
    vi.mocked(questionsApi.startLearningSession).mockRejectedValueOnce(
      new Error('No practice question is currently available.')
    );

    render(
      <MemoryRouter initialEntries={['/learn/overfitting']}>
        <Routes>
          <Route path="/learn/:conceptSlug" element={<LearningSessionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No practice question is currently available.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    // Mock successful response on retry
    vi.mocked(questionsApi.startLearningSession).mockResolvedValueOnce(mockQuestionResponse);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('What is the primary indicator of overfitting?')).toBeInTheDocument();
    });
  });

  it('supports transitioning to Retry stage question', async () => {
    vi.mocked(questionsApi.startLearningSession).mockResolvedValue(mockQuestionResponse);

    const mockRetryResponse = {
      question: {
        id: 'q-overfit-retry',
        conceptId: 'c-overfit',
        conceptSlug: 'overfitting',
        conceptTitle: 'Overfitting',
        stage: 'RETRY' as const,
        difficulty: 'BEGINNER' as const,
        text: 'What is the best corrective action for an overfit decision tree?',
        options: [
          { id: 'opt-r1', text: 'Prune the tree to restrict depth', displayOrder: 1 },
          { id: 'opt-r2', text: 'Increase tree depth to infinity', displayOrder: 2 },
          { id: 'opt-r3', text: 'Ignore validation loss', displayOrder: 3 },
          { id: 'opt-r4', text: 'Remove all regularization', displayOrder: 4 },
        ],
      },
      session: {
        ...mockQuestionResponse.session,
        currentStage: 'RETRY',
      },
    };

    vi.mocked(questionsApi.fetchRetryQuestion).mockResolvedValue(mockRetryResponse);

    render(
      <MemoryRouter initialEntries={['/learn/overfitting']}>
        <Routes>
          <Route path="/learn/:conceptSlug" element={<LearningSessionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('What is the primary indicator of overfitting?')).toBeInTheDocument();
    });

    // Select an option and submit
    const option1 = screen.getByText('High training accuracy, poor validation accuracy');
    fireEvent.click(option1);
    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    fireEvent.click(submitBtn);

    // Stage advance bar appears
    await waitFor(() => {
      expect(screen.getByText(/retry stage/i)).toBeInTheDocument();
    });

    // Click Retry stage
    fireEvent.click(screen.getByText(/retry stage/i));

    await waitFor(() => {
      expect(screen.getByText('What is the best corrective action for an overfit decision tree?')).toBeInTheDocument();
    });

    expect(screen.getByText('Targeted Retry')).toBeInTheDocument();
  });
});
