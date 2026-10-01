import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ConceptDetailPage } from '../modules/curriculum/ConceptDetailPage';
import { AuthContext } from '../modules/auth/AuthContext';
import * as curriculumApi from '../modules/curriculum/api';
import type { ConceptDetail } from '../modules/curriculum/curriculum.types';

vi.mock('../modules/curriculum/api');

const mockStudent = {
  id: 'student-uuid-123',
  name: 'Ada Lovelace',
  email: 'ada@fixxy.edu',
};

const mockDetail: ConceptDetail = {
  id: 'c-1',
  slug: 'overfitting',
  title: 'Overfitting',
  shortDescription: 'Short overview',
  description: 'Full detailed description about overfitting.',
  difficultyLevel: 'BEGINNER',
  estimatedMinutes: 15,
  learningObjective: 'Recognize overfitting and explain why strong training performance does not guarantee generalization.',
  displayOrder: 1,
  prerequisites: [
    {
      id: 'c-3',
      slug: 'train-validation-test',
      title: 'Train / Validation / Test',
    },
  ],
  content: [
    {
      id: 'cnt-1',
      contentType: 'OVERVIEW',
      title: 'What is Overfitting?',
      body: 'Detailed overview of overfitting in machine learning.',
      displayOrder: 1,
    },
    {
      id: 'cnt-2',
      contentType: 'KEY_IDEA',
      title: 'Memorization vs Generalization',
      body: 'Key idea comparing memorization to true generalization.',
      displayOrder: 2,
    },
    {
      id: 'cnt-3',
      contentType: 'ANALOGY',
      title: 'The Practice Exam Memorizer',
      body: 'Analogy about memorizing practice exams.',
      displayOrder: 3,
    },
    {
      id: 'cnt-4',
      contentType: 'EXAMPLE',
      title: 'Polynomial Fitting',
      body: 'Example using high-degree polynomials.',
      displayOrder: 4,
    },
    {
      id: 'cnt-5',
      contentType: 'COMMON_MISTAKE',
      title: 'Evaluating Only on Train Data',
      body: 'Explaining why training accuracy is not enough.',
      displayOrder: 5,
    },
    {
      id: 'cnt-6',
      contentType: 'SUMMARY',
      title: 'Core Takeaways',
      body: 'Key takeaways and prevention techniques.',
      displayOrder: 6,
    },
  ],
  misconceptions: [
    {
      id: 'm-1',
      code: 'OVERFIT_M1',
      title: 'High training accuracy means generalization',
      description: 'Misconception description',
      guidance: 'Contrast training with validation.',
    },
  ],
};

function renderConceptDetailPage(slug = 'overfitting', authOverrides = {}) {
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
    <MemoryRouter initialEntries={[`/curriculum/${slug}`]}>
      <AuthContext.Provider value={contextValue}>
        <Routes>
          <Route path="/curriculum/:slug" element={<ConceptDetailPage />} />
          <Route path="/curriculum" element={<div>Curriculum Catalog Page</div>} />
          <Route path="/learn/:slug" element={<div>Learning Page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('ConceptDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching concept detail', () => {
    vi.mocked(curriculumApi.getConceptBySlug).mockReturnValue(new Promise(() => {}));

    renderConceptDetailPage('overfitting');
    expect(screen.getByText(/loading concept details\.\.\./i)).toBeInTheDocument();
  });

  it('renders concept header, learning objective, and curated content sections when loaded', async () => {
    vi.mocked(curriculumApi.getConceptBySlug).mockResolvedValue(mockDetail);

    renderConceptDetailPage('overfitting');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Overfitting' })).toBeInTheDocument();
    });

    // Learning objective
    expect(screen.getByText(/what you'll learn/i)).toBeInTheDocument();
    expect(
      screen.getByText(/recognize overfitting and explain why strong training performance/i)
    ).toBeInTheDocument();

    // Curated content titles
    expect(screen.getByText('What is Overfitting?')).toBeInTheDocument();
    expect(screen.getByText('Memorization vs Generalization')).toBeInTheDocument();
    expect(screen.getByText('The Practice Exam Memorizer')).toBeInTheDocument();
    expect(screen.getByText('Polynomial Fitting')).toBeInTheDocument();
    expect(screen.getByText('Evaluating Only on Train Data')).toBeInTheDocument();
    expect(screen.getByText('Core Takeaways')).toBeInTheDocument();

    // Prerequisites
    expect(screen.getByText('Train / Validation / Test')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review prerequisite/i })).toHaveAttribute(
      'href',
      '/curriculum/train-validation-test'
    );

    // Back link
    expect(screen.getByRole('link', { name: /back to curriculum/i })).toHaveAttribute(
      'href',
      '/curriculum'
    );
  });

  it('renders 404 / not found state when concept slug does not exist', async () => {
    const err: any = new Error('Concept not found');
    err.status = 404;
    vi.mocked(curriculumApi.getConceptBySlug).mockRejectedValue(err);

    renderConceptDetailPage('non-existent-concept');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /concept not found/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/the concept "non-existent-concept" doesn't exist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to curriculum/i })).toHaveAttribute(
      'href',
      '/curriculum'
    );
  });

  it('renders error state and allows retry on API failure', async () => {
    vi.mocked(curriculumApi.getConceptBySlug)
      .mockRejectedValueOnce(new Error("Couldn't load concept details."))
      .mockResolvedValueOnce(mockDetail);

    renderConceptDetailPage('overfitting');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /couldn't load concept details/i })).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Overfitting' })).toBeInTheDocument();
    });
  });

  it('handles Start Learning button click cleanly', async () => {
    vi.mocked(curriculumApi.getConceptBySlug).mockResolvedValue(mockDetail);

    renderConceptDetailPage('overfitting');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Overfitting' })).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: /start learning →/i });
    fireEvent.click(startBtn);

    expect(screen.getByText('Learning Page')).toBeInTheDocument();
  });
});
