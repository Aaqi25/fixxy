import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MasteryProgress } from '../modules/mastery/MasteryProgress';
import { OverallMasteryCard } from '../modules/mastery/OverallMasteryCard';
import { ConceptMasteryCard } from '../modules/mastery/ConceptMasteryCard';
import { RecentActivity } from '../modules/mastery/RecentActivity';
import { LearningInsights } from '../modules/mastery/LearningInsights';
import { MasteryEmptyState } from '../modules/mastery/MasteryEmptyState';
import { MasteryErrorState } from '../modules/mastery/MasteryErrorState';
import { MasteryDashboard } from '../modules/mastery/MasteryDashboard';
import * as masteryApi from '../modules/mastery/api';
import type {
  MasterySummaryDto,
  ConceptMasteryDto,
  RecentActivityItemDto,
  LearningInsightDto,
} from '../modules/mastery/mastery.types';

// Mock AuthContext
vi.mock('../modules/auth/AuthContext', () => ({
  useAuth: () => ({
    student: { id: 'student-uuid-1', name: 'Ada Lovelace', email: 'ada@fixxy.test' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

const mockSummary: MasterySummaryDto = {
  overallMastery: 68,
  masteryLevel: 'DEVELOPING',
  totalConcepts: 3,
  conceptsStarted: 2,
  conceptsCompleted: 1,
  totalAttempts: 12,
  questionsAnswered: 12,
  correctAttempts: 8,
  retrySuccesses: 4,
  transferSuccesses: 2,
};

const mockConcepts: ConceptMasteryDto[] = [
  {
    conceptId: 'c-1',
    slug: 'overfitting',
    title: 'Overfitting',
    masteryScore: 72,
    masteryLevel: 'PROFICIENT',
    attemptCount: 5,
    correctCount: 4,
    retrySuccessCount: 1,
    transferSuccessCount: 1,
    lastActivityAt: '2026-10-01T10:00:00Z',
  },
  {
    conceptId: 'c-2',
    slug: 'bias-vs-variance',
    title: 'Bias vs Variance',
    masteryScore: 50,
    masteryLevel: 'DEVELOPING',
    attemptCount: 7,
    correctCount: 4,
    retrySuccessCount: 3,
    transferSuccessCount: 1,
    lastActivityAt: '2026-09-30T18:00:00Z',
  },
  {
    conceptId: 'c-3',
    slug: 'train-validation-test',
    title: 'Train / Validation / Test',
    masteryScore: 0,
    masteryLevel: 'NOT_STARTED',
    attemptCount: 0,
    correctCount: 0,
    retrySuccessCount: 0,
    transferSuccessCount: 0,
    lastActivityAt: null,
  },
];

const mockActivity: RecentActivityItemDto[] = [
  {
    id: 'a-1',
    type: 'TRANSFER_SUCCESS',
    conceptTitle: 'Overfitting',
    conceptSlug: 'overfitting',
    phase: 'transfer',
    isCorrect: true,
    timestamp: '2026-10-01T10:00:00Z',
    description: 'Successfully solved transfer challenge on Overfitting',
  },
  {
    id: 'a-2',
    type: 'RETRY_SUCCESS',
    conceptTitle: 'Bias vs Variance',
    conceptSlug: 'bias-vs-variance',
    phase: 'retry',
    isCorrect: true,
    timestamp: '2026-09-30T18:00:00Z',
    description: 'Successfully mastered retry on Bias vs Variance',
  },
];

const mockInsights: LearningInsightDto[] = [
  {
    type: 'STRONGEST_CONCEPT',
    conceptTitle: 'Overfitting',
    conceptSlug: 'overfitting',
    title: 'Strong Mastery in Overfitting',
    description: 'You have reached 72% mastery with solid accuracy and transfer competency.',
    status: 'STRONG',
  },
  {
    type: 'NEEDS_PRACTICE',
    conceptTitle: 'Bias vs Variance',
    conceptSlug: 'bias-vs-variance',
    title: 'Focus Area: Bias vs Variance',
    description: 'Current mastery is 50%. Completing further retry or transfer practice will solidify understanding.',
    status: 'NEEDS_REVIEW',
  },
];

describe('Module 7: Mastery Dashboard UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. MasteryProgress tests
  describe('MasteryProgress Component', () => {
    it('renders with accessibility attributes', () => {
      render(<MasteryProgress score={75} label="Test Progress" showLabel />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('clamps negative or >100 scores safely', () => {
      render(<MasteryProgress score={150} label="Overflown" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  // 2. OverallMasteryCard tests
  describe('OverallMasteryCard Component', () => {
    it('renders overall score, level, and metric numbers', () => {
      render(<OverallMasteryCard summary={mockSummary} />);
      expect(screen.getByTestId('overall-mastery-score')).toHaveTextContent('68%');
      expect(screen.getByTestId('overall-mastery-level')).toHaveTextContent('Developing');
      expect(screen.getByTestId('metric-concepts')).toHaveTextContent('2 / 3');
      expect(screen.getByTestId('metric-questions')).toHaveTextContent('12');
      expect(screen.getByTestId('metric-followups')).toHaveTextContent('6');
    });
  });

  // 3. ConceptMasteryCard tests
  describe('ConceptMasteryCard Component', () => {
    it('renders concept information, score, breakdown and link', () => {
      render(
        <MemoryRouter>
          <ConceptMasteryCard concept={mockConcepts[0]} />
        </MemoryRouter>
      );
      expect(screen.getByText('Overfitting')).toBeInTheDocument();
      expect(screen.getByTestId('concept-score-overfitting')).toHaveTextContent('72%');
      expect(screen.getByTestId('concept-level-overfitting')).toHaveTextContent('Proficient');
      expect(screen.getByText('5')).toBeInTheDocument(); // attempt count
      expect(screen.getByTestId('concept-cta-overfitting')).toHaveTextContent('Continue Learning');
    });

    it('renders Start Concept CTA for unstarted concepts', () => {
      render(
        <MemoryRouter>
          <ConceptMasteryCard concept={mockConcepts[2]} />
        </MemoryRouter>
      );
      expect(screen.getByText('Train / Validation / Test')).toBeInTheDocument();
      expect(screen.getByTestId('concept-score-train-validation-test')).toHaveTextContent('0%');
      expect(screen.getByTestId('concept-level-train-validation-test')).toHaveTextContent('Not Started');
      expect(screen.getByTestId('concept-cta-train-validation-test')).toHaveTextContent('Start Concept');
    });
  });

  // 4. RecentActivity tests
  describe('RecentActivity Component', () => {
    it('renders list of activity items', () => {
      render(
        <MemoryRouter>
          <RecentActivity activity={mockActivity} />
        </MemoryRouter>
      );
      expect(screen.getByTestId('recent-activity-section')).toBeInTheDocument();
      expect(screen.getByText('Successfully solved transfer challenge on Overfitting')).toBeInTheDocument();
      expect(screen.getByText('Successfully mastered retry on Bias vs Variance')).toBeInTheDocument();
    });

    it('renders empty message when activity array is empty', () => {
      render(
        <MemoryRouter>
          <RecentActivity activity={[]} />
        </MemoryRouter>
      );
      expect(screen.getByText('No recent learning activity yet.')).toBeInTheDocument();
    });
  });

  // 5. LearningInsights tests
  describe('LearningInsights Component', () => {
    it('renders insights cards with descriptions', () => {
      render(
        <MemoryRouter>
          <LearningInsights insights={mockInsights} />
        </MemoryRouter>
      );
      expect(screen.getByTestId('learning-insights-section')).toBeInTheDocument();
      expect(screen.getByText('Strong Mastery in Overfitting')).toBeInTheDocument();
      expect(screen.getByText('Focus Area: Bias vs Variance')).toBeInTheDocument();
    });

    it('renders empty notice when no insights available', () => {
      render(
        <MemoryRouter>
          <LearningInsights insights={[]} />
        </MemoryRouter>
      );
      expect(
        screen.getByText('Complete practice and retry questions to generate personalized insights.')
      ).toBeInTheDocument();
    });
  });

  // 6. MasteryEmptyState tests
  describe('MasteryEmptyState Component', () => {
    it('renders empty journey welcome message and explore CTA', () => {
      render(
        <MemoryRouter>
          <MasteryEmptyState />
        </MemoryRouter>
      );
      expect(screen.getByTestId('mastery-empty-state')).toBeInTheDocument();
      expect(screen.getByText('Your learning journey starts here.')).toBeInTheDocument();
      expect(screen.getByTestId('empty-explore-curriculum-button')).toHaveAttribute('href', '/curriculum');
    });
  });

  // 7. MasteryErrorState tests
  describe('MasteryErrorState Component', () => {
    it('renders error message and triggers onRetry when clicked', () => {
      const retryMock = vi.fn();
      render(<MasteryErrorState message="Server unavailable" onRetry={retryMock} />);
      expect(screen.getByTestId('mastery-error-state')).toBeInTheDocument();
      expect(screen.getByText('Server unavailable')).toBeInTheDocument();

      const retryBtn = screen.getByTestId('mastery-retry-button');
      fireEvent.click(retryBtn);
      expect(retryMock).toHaveBeenCalledTimes(1);
    });
  });

  // 8. Full MasteryDashboard Page Integration tests
  describe('MasteryDashboard Page Integration', () => {
    it('loads and displays dashboard data successfully', async () => {
      vi.spyOn(masteryApi, 'getOverallMastery').mockResolvedValue(mockSummary);
      vi.spyOn(masteryApi, 'getConceptMasteries').mockResolvedValue(mockConcepts);
      vi.spyOn(masteryApi, 'getRecentActivity').mockResolvedValue(mockActivity);
      vi.spyOn(masteryApi, 'getLearningInsights').mockResolvedValue(mockInsights);

      render(
        <MemoryRouter>
          <MasteryDashboard />
        </MemoryRouter>
      );

      // Loading state
      expect(screen.getByTestId('mastery-loading-state')).toBeInTheDocument();

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByTestId('mastery-dashboard-title')).toBeInTheDocument();
      });

      expect(screen.getByTestId('overall-mastery-card')).toBeInTheDocument();
      expect(screen.getByTestId('concepts-section')).toBeInTheDocument();
      expect(screen.getByTestId('concept-card-overfitting')).toBeInTheDocument();
      expect(screen.getByTestId('concept-card-bias-vs-variance')).toBeInTheDocument();
      expect(screen.getByTestId('concept-card-train-validation-test')).toBeInTheDocument();
      expect(screen.getByTestId('recent-activity-section')).toBeInTheDocument();
      expect(screen.getByTestId('learning-insights-section')).toBeInTheDocument();
    });

    it('displays empty state for brand new student with 0 attempts', async () => {
      const emptySummary: MasterySummaryDto = {
        overallMastery: 0,
        masteryLevel: 'NOT_STARTED',
        totalConcepts: 3,
        conceptsStarted: 0,
        conceptsCompleted: 0,
        totalAttempts: 0,
        questionsAnswered: 0,
        correctAttempts: 0,
        retrySuccesses: 0,
        transferSuccesses: 0,
      };

      vi.spyOn(masteryApi, 'getOverallMastery').mockResolvedValue(emptySummary);
      vi.spyOn(masteryApi, 'getConceptMasteries').mockResolvedValue(mockConcepts.map((c) => ({ ...c, attemptCount: 0, masteryScore: 0, masteryLevel: 'NOT_STARTED' })));
      vi.spyOn(masteryApi, 'getRecentActivity').mockResolvedValue([]);
      vi.spyOn(masteryApi, 'getLearningInsights').mockResolvedValue([]);

      render(
        <MemoryRouter>
          <MasteryDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mastery-empty-state')).toBeInTheDocument();
      });
      expect(screen.getByText('Your learning journey starts here.')).toBeInTheDocument();
    });

    it('displays error state when API fails and allows retry', async () => {
      vi.spyOn(masteryApi, 'getOverallMastery').mockRejectedValueOnce(new Error('Network error'));

      render(
        <MemoryRouter>
          <MasteryDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mastery-error-state')).toBeInTheDocument();
      });
      expect(screen.getByText('Network error')).toBeInTheDocument();

      // Retry succeeds
      vi.spyOn(masteryApi, 'getOverallMastery').mockResolvedValue(mockSummary);
      vi.spyOn(masteryApi, 'getConceptMasteries').mockResolvedValue(mockConcepts);
      vi.spyOn(masteryApi, 'getRecentActivity').mockResolvedValue(mockActivity);
      vi.spyOn(masteryApi, 'getLearningInsights').mockResolvedValue(mockInsights);

      fireEvent.click(screen.getByTestId('mastery-retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('overall-mastery-card')).toBeInTheDocument();
      });
    });

    it('refreshes dashboard data when refresh button is clicked', async () => {
      vi.spyOn(masteryApi, 'getOverallMastery').mockResolvedValue(mockSummary);
      vi.spyOn(masteryApi, 'getConceptMasteries').mockResolvedValue(mockConcepts);
      vi.spyOn(masteryApi, 'getRecentActivity').mockResolvedValue(mockActivity);
      vi.spyOn(masteryApi, 'getLearningInsights').mockResolvedValue(mockInsights);

      render(
        <MemoryRouter>
          <MasteryDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('overall-mastery-card')).toBeInTheDocument();
      });

      const refreshBtn = screen.getByTestId('refresh-dashboard-button');
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(masteryApi.getOverallMastery).toHaveBeenCalledTimes(2);
      });
    });
  });
});
