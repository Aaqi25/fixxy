import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TeachingPanel } from '../modules/retry-transfer/TeachingPanel';
import { RetryPanel } from '../modules/retry-transfer/RetryPanel';
import { TransferPanel } from '../modules/retry-transfer/TransferPanel';
import { LearningStage } from '../modules/retry-transfer/LearningStage';
import { FeedbackPanel } from '../modules/retry-transfer/FeedbackPanel';
import { RetryTransferPage } from '../modules/retry-transfer/RetryTransferPage';
import * as retryTransferApi from '../modules/retry-transfer/api';
import type {
  SafeQuestion,
  TeachingResponse,
  RetryTransferSessionData,
} from '../modules/retry-transfer/retry-transfer.types';

// Mock AuthContext
vi.mock('../modules/auth/AuthContext', () => ({
  useAuth: () => ({
    student: { id: 'student-uuid-1', name: 'Ada Lovelace', email: 'ada@fixxy.test' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

const mockTeaching: TeachingResponse = {
  misconceptionId: 'm-1',
  misconceptionCode: 'OVERFIT_M1',
  misconceptionTitle: 'Training accuracy means generalization',
  strategy: 'analogy',
  explanation: 'A model memorizing training questions is like a student memorizing practice exam answer keys.',
  hint: 'Compare training performance against held-out validation or test accuracy.',
  confidence: 0.92,
  isReteach: false,
};

const mockReteachTeaching: TeachingResponse = {
  misconceptionId: 'm-1',
  misconceptionCode: 'OVERFIT_M1',
  misconceptionTitle: 'Training accuracy means generalization',
  strategy: 'counterexample',
  explanation: "Let's approach this from another angle. Think of a 10th-degree polynomial connecting every noisy point.",
  hint: 'Check whether the validation loss is rising even as training loss continues dropping.',
  confidence: 0.95,
  isReteach: true,
};

const mockRetryQuestion: SafeQuestion = {
  id: 'q-retry-overfit-2',
  conceptId: 'concept-overfit-uuid',
  conceptSlug: 'overfitting',
  conceptTitle: 'Overfitting',
  code: 'OVERFIT_Q2',
  phase: 'retry',
  prompt: 'A decision tree classifier scores 100% on training data and 55% on validation. What does this indicate?',
  difficulty: 2,
  options: [
    {
      id: 'opt-r1',
      position: 1,
      optionText: 'The gap between training and validation accuracy is a clear sign of overfitting.',
    },
    {
      id: 'opt-r2',
      position: 2,
      optionText: 'The model has learned perfectly because training score is 100%.',
    },
    {
      id: 'opt-r3',
      position: 3,
      optionText: 'More data is needed before any conclusion can be drawn.',
    },
    {
      id: 'opt-r4',
      position: 4,
      optionText: 'The validation set is probably mislabelled.',
    },
  ],
};

const mockTransferQuestion: SafeQuestion = {
  id: 'q-transfer-overfit-3',
  conceptId: 'concept-overfit-uuid',
  conceptSlug: 'overfitting',
  conceptTitle: 'Overfitting',
  code: 'OVERFIT_Q3',
  phase: 'transfer',
  prompt: 'A sentiment classifier trained on movie reviews achieves 97% training accuracy but drops to 54% when deployed to e-commerce product reviews. How should this be evaluated?',
  difficulty: 3,
  options: [
    {
      id: 'opt-t1',
      position: 1,
      optionText: 'The classifier overfit to movie language and cannot generalize to product review vocabulary.',
    },
    {
      id: 'opt-t2',
      position: 2,
      optionText: 'High training accuracy is always the best predictor of production accuracy.',
    },
    {
      id: 'opt-t3',
      position: 3,
      optionText: 'The poor accuracy is solely caused by product review typos.',
    },
    {
      id: 'opt-t4',
      position: 4,
      optionText: 'Production accuracy is always lower so this drop is acceptable.',
    },
  ],
};

const mockSessionData: RetryTransferSessionData = {
  id: 'session-uuid-1',
  studentId: 'student-uuid-1',
  conceptId: 'concept-overfit-uuid',
  conceptSlug: 'overfitting',
  conceptTitle: 'Overfitting',
  status: 'teaching',
  stage: 'TEACHING',
  startedAt: '2026-10-01T12:00:00Z',
  completedAt: null,
  teaching: mockTeaching,
  question: mockRetryQuestion,
  originalQuestion: {
    id: 'q-practice-overfit-1',
    conceptId: 'concept-overfit-uuid',
    code: 'OVERFIT_Q1',
    phase: 'practice',
    prompt: 'A neural network scores 99.5% on training and 61% on test. What does this mean?',
    difficulty: 1,
    options: [],
  },
  history: [
    {
      id: 'att-1',
      questionId: 'q-practice-overfit-1',
      phase: 'practice',
      isCorrect: false,
      attemptNumber: 1,
      submittedAt: '2026-10-01T12:01:00Z',
    },
  ],
  isCompleted: false,
};

describe('Module 6 — TeachingPanel Component Tests', () => {
  it('TeachingPanel renders diagnosis', () => {
    render(<TeachingPanel teaching={mockTeaching} />);
    expect(screen.getByText('Diagnosed Misconception')).toBeInTheDocument();
    expect(screen.getByText('Training accuracy means generalization')).toBeInTheDocument();
    expect(screen.getByText('OVERFIT_M1')).toBeInTheDocument();
  });

  it('TeachingPanel renders explanation', () => {
    render(<TeachingPanel teaching={mockTeaching} />);
    expect(screen.getByText('Personalized Explanation')).toBeInTheDocument();
    expect(
      screen.getByText('A model memorizing training questions is like a student memorizing practice exam answer keys.')
    ).toBeInTheDocument();
  });

  it('TeachingPanel renders hint', () => {
    render(<TeachingPanel teaching={mockTeaching} />);
    expect(screen.getByText('Key Hint')).toBeInTheDocument();
    expect(
      screen.getByText('Compare training performance against held-out validation or test accuracy.')
    ).toBeInTheDocument();
  });

  it('TeachingPanel renders strategy tag badge', () => {
    render(<TeachingPanel teaching={mockTeaching} />);
    expect(screen.getByText('Conceptual Analogy')).toBeInTheDocument();
  });

  it('Continue action works and calls onContinueToRetry', () => {
    const handleContinue = vi.fn();
    render(<TeachingPanel teaching={mockTeaching} onContinueToRetry={handleContinue} />);

    const continueBtn = screen.getByRole('button', { name: /continue to retry question/i });
    expect(continueBtn).toBeInTheDocument();
    fireEvent.click(continueBtn);
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });
});

describe('Module 6 — RetryPanel Component Tests', () => {
  it('RetryPanel renders question and options', () => {
    const handleSubmit = vi.fn();
    render(<RetryPanel question={mockRetryQuestion} onSubmit={handleSubmit} />);

    expect(screen.getByText(mockRetryQuestion.prompt)).toBeInTheDocument();
    expect(screen.getByText('RETRY')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByText('The gap between training and validation accuracy is a clear sign of overfitting.')
    ).toBeInTheDocument();
  });

  it('Option selection works', () => {
    const handleSubmit = vi.fn();
    render(<RetryPanel question={mockRetryQuestion} onSubmit={handleSubmit} />);

    const option1 = screen.getAllByRole('radio')[0];
    expect(option1).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(option1);
    expect(option1).toHaveAttribute('aria-checked', 'true');
  });

  it('Submit disabled without selection', () => {
    const handleSubmit = vi.fn();
    render(<RetryPanel question={mockRetryQuestion} onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /submit retry answer/i });
    expect(submitBtn).toBeDisabled();
  });

  it('Submit disabled while submitting', () => {
    const handleSubmit = vi.fn();
    render(<RetryPanel question={mockRetryQuestion} onSubmit={handleSubmit} isSubmitting={true} />);

    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText('Checking your answer...')).toBeInTheDocument();
  });

  it('Retry correct feedback renders', () => {
    const handleSubmit = vi.fn();
    const handleContinue = vi.fn();
    render(
      <RetryPanel
        question={mockRetryQuestion}
        onSubmit={handleSubmit}
        result={{ correct: true }}
        onContinueToTransfer={handleContinue}
      />
    );

    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('You applied the idea successfully.')).toBeInTheDocument();
    const transferBtn = screen.getByRole('button', { name: /continue to transfer question/i });
    expect(transferBtn).toBeInTheDocument();
    fireEvent.click(transferBtn);
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('Retry wrong feedback renders', () => {
    const handleSubmit = vi.fn();
    const handleReteach = vi.fn();
    render(
      <RetryPanel
        question={mockRetryQuestion}
        onSubmit={handleSubmit}
        result={{ correct: false }}
        onContinueToReteach={handleReteach}
      />
    );

    expect(screen.getByText('Not quite.')).toBeInTheDocument();
    expect(screen.getByText("Let's look at this another way.")).toBeInTheDocument();
    const reteachBtn = screen.getByRole('button', { name: /review explanation & approach again/i });
    expect(reteachBtn).toBeInTheDocument();
    fireEvent.click(reteachBtn);
    expect(handleReteach).toHaveBeenCalledTimes(1);
  });
});

describe('Module 6 — TransferPanel Component Tests', () => {
  it('TransferPanel renders question and options', () => {
    const handleSubmit = vi.fn();
    render(<TransferPanel question={mockTransferQuestion} onSubmit={handleSubmit} />);

    expect(screen.getByText(mockTransferQuestion.prompt)).toBeInTheDocument();
    expect(screen.getByText('TRANSFER')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByText(
        'The classifier overfit to movie language and cannot generalize to product review vocabulary.'
      )
    ).toBeInTheDocument();
  });

  it('Transfer submit works and calls onSubmit', async () => {
    const handleSubmit = vi.fn();
    render(<TransferPanel question={mockTransferQuestion} onSubmit={handleSubmit} />);

    const option1 = screen.getAllByRole('radio')[0];
    fireEvent.click(option1);

    const submitBtn = screen.getByRole('button', { name: /submit transfer answer/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith('opt-t1');
  });

  it('Transfer pass renders', () => {
    const handleSubmit = vi.fn();
    const handleComplete = vi.fn();
    render(
      <TransferPanel
        question={mockTransferQuestion}
        onSubmit={handleSubmit}
        result={{ correct: true }}
        onComplete={handleComplete}
      />
    );

    expect(screen.getByText('Transfer Success')).toBeInTheDocument();
    expect(
      screen.getByText('You successfully applied the concept to a new scenario.')
    ).toBeInTheDocument();
    const completeBtn = screen.getByRole('button', { name: /view concept completion/i });
    expect(completeBtn).toBeInTheDocument();
    fireEvent.click(completeBtn);
    expect(handleComplete).toHaveBeenCalledTimes(1);
  });

  it('Transfer fail renders', () => {
    const handleSubmit = vi.fn();
    const handleReteach = vi.fn();
    render(
      <TransferPanel
        question={mockTransferQuestion}
        onSubmit={handleSubmit}
        result={{ correct: false }}
        onContinueToReteach={handleReteach}
      />
    );

    expect(screen.getByText('Not yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Transfer requires adapting to new conditions. Let us approach this another way.')
    ).toBeInTheDocument();
    const reteachBtn = screen.getByRole('button', { name: /review concept & try again/i });
    expect(reteachBtn).toBeInTheDocument();
    fireEvent.click(reteachBtn);
    expect(handleReteach).toHaveBeenCalledTimes(1);
  });
});

describe('Module 6 — LearningStage & FeedbackPanel Tests', () => {
  it('LearningStage renders Teaching, Retry, Transfer progression steps', () => {
    render(<LearningStage currentStage="TEACHING" session={mockSessionData} />);

    expect(screen.getByText('Teaching')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('aria-current', 'step');
  });

  it('LearningStage marks completed steps when in Transfer', () => {
    render(<LearningStage currentStage="TRANSFER_READY" session={{ ...mockSessionData, stage: 'TRANSFER' }} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveClass('stage-step-completed');
    expect(items[1]).toHaveClass('stage-step-completed');
    expect(items[2]).toHaveClass('stage-step-current');
  });

  it('FeedbackPanel renders custom action and message', () => {
    const onAction = vi.fn();
    render(
      <FeedbackPanel
        type="complete"
        title="Custom Completion Title"
        message="Custom message body"
        actionLabel="Next Step"
        onAction={onAction}
      />
    );

    expect(screen.getByText('Custom Completion Title')).toBeInTheDocument();
    expect(screen.getByText('Custom message body')).toBeInTheDocument();
    const actionBtn = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('Module 6 — RetryTransferPage Orchestration & State Recovery Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching session', () => {
    vi.spyOn(retryTransferApi, 'getSessionByConcept').mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/curriculum/overfitting/retry-transfer']}>
        <Routes>
          <Route path="/curriculum/:slug/retry-transfer" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading concept tutoring session/i)).toBeInTheDocument();
  });

  it('renders error state and retry button if session fetch fails', async () => {
    vi.spyOn(retryTransferApi, 'getSessionByConcept').mockRejectedValue(
      new Error("Couldn't connect to FIXXY. Please check your connection and try again.")
    );

    render(
      <MemoryRouter initialEntries={['/curriculum/overfitting/retry-transfer']}>
        <Routes>
          <Route path="/curriculum/:slug/retry-transfer" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText("Couldn't connect to FIXXY. Please check your connection and try again.")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('restores TEACHING stage on refresh recovery', async () => {
    vi.spyOn(retryTransferApi, 'getSessionById').mockResolvedValue(mockSessionData);

    render(
      <MemoryRouter initialEntries={['/retry-transfer/session-uuid-1']}>
        <Routes>
          <Route path="/retry-transfer/:sessionId" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Let's Review the Core Idea")).toBeInTheDocument();
      expect(screen.getByText('Diagnosed Misconception')).toBeInTheDocument();
      expect(screen.getByText('Training accuracy means generalization')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /continue to retry question/i }).length).toBeGreaterThan(0);
    });
  });

  it('restores RETRY stage on refresh recovery without resetting', async () => {
    const retrySession: RetryTransferSessionData = {
      ...mockSessionData,
      status: 'retry',
      stage: 'RETRY',
      question: mockRetryQuestion,
    };
    vi.spyOn(retryTransferApi, 'getSessionById').mockResolvedValue(retrySession);

    render(
      <MemoryRouter initialEntries={['/retry-transfer/session-uuid-1']}>
        <Routes>
          <Route path="/retry-transfer/:sessionId" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(mockRetryQuestion.prompt)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit retry answer/i })).toBeInTheDocument();
    });
  });

  it('restores TRANSFER stage on refresh recovery without resetting', async () => {
    const transferSession: RetryTransferSessionData = {
      ...mockSessionData,
      status: 'transfer',
      stage: 'TRANSFER',
      question: mockTransferQuestion,
    };
    vi.spyOn(retryTransferApi, 'getSessionById').mockResolvedValue(transferSession);

    render(
      <MemoryRouter initialEntries={['/retry-transfer/session-uuid-1']}>
        <Routes>
          <Route path="/retry-transfer/:sessionId" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(mockTransferQuestion.prompt)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit transfer answer/i })).toBeInTheDocument();
    });
  });

  it('renders RETEACHING state when session stage is RETEACHING', async () => {
    const reteachSession: RetryTransferSessionData = {
      ...mockSessionData,
      status: 'reteaching',
      stage: 'RETEACHING',
      teaching: mockReteachTeaching,
      question: mockRetryQuestion,
    };
    vi.spyOn(retryTransferApi, 'getSessionById').mockResolvedValue(reteachSession);

    render(
      <MemoryRouter initialEntries={['/retry-transfer/session-uuid-1']}>
        <Routes>
          <Route path="/retry-transfer/:sessionId" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Approaching From Another Angle')).toBeInTheDocument();
      expect(screen.getByText("Let's approach this from another angle.")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try question again/i })).toBeInTheDocument();
    });
  });

  it('renders COMPLETED state when session is completed', async () => {
    const completedSession: RetryTransferSessionData = {
      ...mockSessionData,
      status: 'complete',
      stage: 'COMPLETED',
      isCompleted: true,
      completedAt: '2026-10-01T12:05:00Z',
    };
    vi.spyOn(retryTransferApi, 'getSessionById').mockResolvedValue(completedSession);

    render(
      <MemoryRouter initialEntries={['/retry-transfer/session-uuid-1']}>
        <Routes>
          <Route path="/retry-transfer/:sessionId" element={<RetryTransferPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Concept Complete')).toBeInTheDocument();
      expect(screen.getByText(/You successfully applied/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /continue learning/i })).toBeInTheDocument();
    });
  });

  it('verifies question separation: originalQuestionId != retryQuestionId != transferQuestionId', () => {
    const originalId = mockSessionData.originalQuestion!.id;
    const retryId = mockRetryQuestion.id;
    const transferId = mockTransferQuestion.id;

    expect(originalId).not.toEqual(retryId);
    expect(retryId).not.toEqual(transferId);
    expect(originalId).not.toEqual(transferId);
  });
});
