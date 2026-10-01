import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QuestionCard } from '../modules/answer-submission/QuestionCard';
import { PracticePage } from '../modules/answer-submission/PracticePage';
import * as answerApi from '../modules/answer-submission/api';
import type { PracticeQuestion, AttemptResult } from '../modules/answer-submission/answer-submission.types';

// Mock AuthContext
vi.mock('../modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-123', name: 'Ada Lovelace', email: 'ada@fixxy.edu' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

const mockQuestion: PracticeQuestion = {
  id: 'q-overfitting-1',
  conceptId: 'concept-overfit-uuid',
  conceptSlug: 'overfitting',
  conceptTitle: 'Overfitting',
  code: 'OVERFIT_Q1',
  phase: 'practice',
  prompt: 'A neural network achieves 99.5% training accuracy and 61% test accuracy. What does this indicate?',
  difficulty: 2,
  options: [
    {
      id: 'opt-1-correct',
      position: 1,
      optionText: 'The model has overfit the training data and does not generalize well.',
    },
    {
      id: 'opt-2-wrong',
      position: 2,
      optionText: 'The model is performing well because training accuracy is very high.',
    },
    {
      id: 'opt-3-wrong',
      position: 3,
      optionText: 'The model needs more training epochs to improve test accuracy.',
    },
    {
      id: 'opt-4-wrong',
      position: 4,
      optionText: 'The test set is too small to draw any conclusion.',
    },
  ],
};

const mockCorrectResponse: AttemptResult = {
  attempt: {
    id: 'att-123',
    questionId: 'q-overfitting-1',
    selectedOptionId: 'opt-1-correct',
    sessionId: 'session-123',
    isCorrect: true,
    attemptNumber: 1,
    submittedAt: '2026-10-01T12:00:00Z',
  },
  result: {
    correct: true,
  },
};

const mockWrongResponse: AttemptResult = {
  attempt: {
    id: 'att-124',
    questionId: 'q-overfitting-1',
    selectedOptionId: 'opt-2-wrong',
    sessionId: 'session-123',
    isCorrect: false,
    attemptNumber: 1,
    submittedAt: '2026-10-01T12:00:00Z',
  },
  result: {
    correct: false,
  },
};

describe('Module 5: Answer Submission Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders question prompt, metadata, difficulty, and all options', () => {
    render(<QuestionCard question={mockQuestion} questionNumber={1} totalQuestions={3} />);

    expect(screen.getByText(mockQuestion.prompt)).toBeInTheDocument();
    expect(screen.getByText('PRACTICE')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();

    // Verify all 4 options are rendered with option letters
    expect(screen.getByText('The model has overfit the training data and does not generalize well.')).toBeInTheDocument();
    expect(screen.getByText('The model is performing well because training accuracy is very high.')).toBeInTheDocument();
    expect(screen.getByText('The model needs more training epochs to improve test accuracy.')).toBeInTheDocument();
    expect(screen.getByText('The test set is too small to draw any conclusion.')).toBeInTheDocument();

    const options = screen.getAllByRole('radio');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('Submit button is disabled by default until an option is selected', () => {
    render(<QuestionCard question={mockQuestion} />);

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    expect(submitBtn).toBeDisabled();

    // Select Option 1
    const option1 = screen.getAllByRole('radio')[0];
    fireEvent.click(option1);

    expect(option1).toHaveAttribute('aria-checked', 'true');
    expect(submitBtn).toBeEnabled();
  });

  it('supports keyboard navigation and selection with Space or Enter key', () => {
    render(<QuestionCard question={mockQuestion} />);

    const option2 = screen.getAllByRole('radio')[1];
    expect(option2).toHaveAttribute('aria-checked', 'false');

    // Press Space on option 2
    fireEvent.keyDown(option2, { key: ' ' });
    expect(option2).toHaveAttribute('aria-checked', 'true');

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    expect(submitBtn).toBeEnabled();
  });

  it('displays loading state "Checking your answer..." while submission is in flight', async () => {
    let resolveSubmit: (val: AttemptResult) => void;
    const submitPromise = new Promise<AttemptResult>((resolve) => {
      resolveSubmit = resolve;
    });

    vi.spyOn(answerApi, 'submitAnswer').mockReturnValue(submitPromise);

    render(<QuestionCard question={mockQuestion} />);

    // Select option 1
    fireEvent.click(screen.getAllByRole('radio')[0]);

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    fireEvent.click(submitBtn);

    // Verify loading spinner text and disabled state
    expect(screen.getByText(/checking your answer\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

    // Complete the submission
    resolveSubmit!(mockCorrectResponse);

    await waitFor(() => {
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });
  });

  it('renders correct result banner and option styling on correct answer', async () => {
    vi.spyOn(answerApi, 'submitAnswer').mockResolvedValue(mockCorrectResponse);

    render(<QuestionCard question={mockQuestion} hasNextQuestion={true} onNextQuestion={vi.fn()} />);

    // Select option 1
    const option1 = screen.getAllByRole('radio')[0];
    fireEvent.click(option1);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Correct')).toBeInTheDocument();
      expect(screen.getByText('Great work.')).toBeInTheDocument();
    });

    // Checkmark indicator visible
    expect(screen.getAllByText('✓').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /next question →/i })).toBeInTheDocument();
  });

  it('renders wrong result banner and option styling on wrong answer, allowing Try Again', async () => {
    vi.spyOn(answerApi, 'submitAnswer').mockResolvedValue(mockWrongResponse);

    render(<QuestionCard question={mockQuestion} />);

    // Select option 2 (wrong)
    const option2 = screen.getAllByRole('radio')[1];
    fireEvent.click(option2);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Not quite.')).toBeInTheDocument();
      expect(screen.getByText("Let's understand why.")).toBeInTheDocument();
    });

    // Cross mark visible in badge and banner
    expect(screen.getAllByText('✗').length).toBeGreaterThanOrEqual(1);

    // Click Try Again to reset selection for next attempt
    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    fireEvent.click(tryAgainBtn);

    // Should return to unanswered state with Submit Answer disabled
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeDisabled();
  });

  it('displays API error banner when server rejects submission (e.g. 400 or 500)', async () => {
    vi.spyOn(answerApi, 'submitAnswer').mockRejectedValue({
      message: 'Selected option does not belong to the specified question',
      status: 400,
    });

    render(<QuestionCard question={mockQuestion} />);

    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/selected option does not belong to the specified question/i)).toBeInTheDocument();
    });
  });

  it('displays network connection error banner when network fails', async () => {
    vi.spyOn(answerApi, 'submitAnswer').mockRejectedValue({
      message: "Couldn't connect to FIXXY. Please try again.",
      status: 0,
      isNetworkError: true,
    });

    render(<QuestionCard question={mockQuestion} />);

    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/couldn't connect to fixxy\. please try again\./i)).toBeInTheDocument();
    });
  });

  it('prevents accidental duplicate requests when clicking rapidly', async () => {
    const submitSpy = vi.spyOn(answerApi, 'submitAnswer').mockResolvedValue(mockCorrectResponse);

    render(<QuestionCard question={mockQuestion} />);

    fireEvent.click(screen.getAllByRole('radio')[0]);
    const submitBtn = screen.getByRole('button', { name: /submit answer/i });

    // Rapid double click
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(submitSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });
  });
});

describe('Module 5: PracticePage Integration Tests', () => {
  it('loads practice questions and integrates with QuestionCard and progress tracker', async () => {
    vi.spyOn(answerApi, 'getQuestionsForConcept').mockResolvedValue([mockQuestion]);
    vi.spyOn(answerApi, 'startLearningSession').mockResolvedValue({ id: 'session-uuid-1' });

    render(
      <MemoryRouter initialEntries={['/curriculum/overfitting/practice']}>
        <Routes>
          <Route path="/curriculum/:slug/practice" element={<PracticePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial loading indicator
    expect(screen.getByText(/loading practice questions\.\.\./i)).toBeInTheDocument();

    // After loading resolves
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /practice: overfitting/i })).toBeInTheDocument();
      expect(screen.getByText(mockQuestion.prompt)).toBeInTheDocument();
      expect(screen.getByText(/1 of 1 Questions/i)).toBeInTheDocument();
    });
  });
});
