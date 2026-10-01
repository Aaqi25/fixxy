import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CurriculumPage } from '../modules/curriculum/CurriculumPage';
import { AuthContext } from '../modules/auth/AuthContext';
import * as curriculumApi from '../modules/curriculum/api';
import type { ConceptSummary, LearningPathNode } from '../modules/curriculum/curriculum.types';

vi.mock('../modules/curriculum/api');

const mockStudent = {
  id: 'student-uuid-123',
  name: 'Ada Lovelace',
  email: 'ada@fixxy.edu',
};

const mockConcepts: ConceptSummary[] = [
  {
    id: 'c-1',
    slug: 'overfitting',
    title: 'Overfitting',
    shortDescription: 'Recognize when a model learns noise in training data.',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 15,
    displayOrder: 1,
  },
  {
    id: 'c-2',
    slug: 'bias-vs-variance',
    title: 'Bias vs Variance',
    shortDescription: 'Balance model simplicity and flexibility.',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 20,
    displayOrder: 2,
  },
  {
    id: 'c-3',
    slug: 'train-validation-test',
    title: 'Train / Validation / Test',
    shortDescription: 'Partition datasets to train, tune, and evaluate.',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 15,
    displayOrder: 3,
  },
];

const mockPath: LearningPathNode[] = [
  {
    id: 'c-1',
    slug: 'overfitting',
    title: 'Overfitting',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 15,
    displayOrder: 1,
    prerequisites: [{ id: 'c-3', slug: 'train-validation-test', title: 'Train / Validation / Test' }],
  },
  {
    id: 'c-2',
    slug: 'bias-vs-variance',
    title: 'Bias vs Variance',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 20,
    displayOrder: 2,
    prerequisites: [{ id: 'c-1', slug: 'overfitting', title: 'Overfitting' }],
  },
  {
    id: 'c-3',
    slug: 'train-validation-test',
    title: 'Train / Validation / Test',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 15,
    displayOrder: 3,
    prerequisites: [],
  },
];

function renderCurriculumPage(authOverrides = {}) {
  const contextValue = {
    student: mockStudent,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearError: vi.fn(),
    ...authOverrides,
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={contextValue}>
        <CurriculumPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('CurriculumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching curriculum', () => {
    vi.mocked(curriculumApi.getConcepts).mockReturnValue(new Promise(() => {}));
    vi.mocked(curriculumApi.getLearningPath).mockReturnValue(new Promise(() => {}));

    renderCurriculumPage();
    expect(screen.getByText(/loading your curriculum\.\.\./i)).toBeInTheDocument();
  });

  it('renders concepts catalog and learning path when loaded successfully', async () => {
    vi.mocked(curriculumApi.getConcepts).mockResolvedValue(mockConcepts);
    vi.mocked(curriculumApi.getLearningPath).mockResolvedValue(mockPath);

    renderCurriculumPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Overfitting' })).toBeInTheDocument();
    });

    // Check all three concepts are rendered
    expect(screen.getByRole('heading', { level: 3, name: 'Bias vs Variance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Train / Validation / Test' })).toBeInTheDocument();

    // Check explore buttons
    expect(screen.getByRole('link', { name: /explore overfitting/i })).toHaveAttribute(
      'href',
      '/curriculum/overfitting'
    );
    expect(screen.getByRole('link', { name: /explore bias vs variance/i })).toHaveAttribute(
      'href',
      '/curriculum/bias-vs-variance'
    );
  });

  it('renders empty state when curriculum returns no concepts', async () => {
    vi.mocked(curriculumApi.getConcepts).mockResolvedValue([]);
    vi.mocked(curriculumApi.getLearningPath).mockResolvedValue([]);

    renderCurriculumPage();

    await waitFor(() => {
      expect(screen.getByText(/no learning content is available yet\./i)).toBeInTheDocument();
    });
  });

  it('renders error state and retries successfully when clicking retry', async () => {
    vi.mocked(curriculumApi.getConcepts)
      .mockRejectedValueOnce(new Error("Couldn't connect to FIXXY."))
      .mockResolvedValueOnce(mockConcepts);
    vi.mocked(curriculumApi.getLearningPath).mockResolvedValue(mockPath);

    renderCurriculumPage();

    await waitFor(() => {
      expect(screen.getByText(/couldn't load the curriculum\./i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Overfitting' })).toBeInTheDocument();
    });
  });

  it('handles logout from header navigation', async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(curriculumApi.getConcepts).mockResolvedValue(mockConcepts);
    vi.mocked(curriculumApi.getLearningPath).mockResolvedValue(mockPath);

    renderCurriculumPage({ logout: logoutMock });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Overfitting' })).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /sign out of fixxy/i });
    fireEvent.click(logoutBtn);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
