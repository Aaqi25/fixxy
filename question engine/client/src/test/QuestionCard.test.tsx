import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuestionCard } from '../modules/questions/QuestionCard';
import type { StudentQuestion } from '../modules/questions/question.types';

const mockQuestion: StudentQuestion = {
  id: 'q-overfit-1',
  conceptId: 'concept-1',
  conceptSlug: 'overfitting',
  conceptTitle: 'Overfitting',
  stage: 'PRACTICE',
  difficulty: 'BEGINNER',
  text: 'What is the primary indicator of overfitting in machine learning?',
  options: [
    { id: 'opt-1', text: 'High training accuracy but poor validation accuracy', displayOrder: 1 },
    { id: 'opt-2', text: 'Low training accuracy and low test accuracy', displayOrder: 2 },
    { id: 'opt-3', text: 'Identical error across all data partitions', displayOrder: 3 },
    { id: 'opt-4', text: 'Zero parameters in the hypothesis function', displayOrder: 4 },
  ],
};

describe('QuestionCard component', () => {
  it('renders question prompt, stage, difficulty, and concept title', () => {
    render(<QuestionCard question={mockQuestion} />);

    expect(screen.getByText('What is the primary indicator of overfitting in machine learning?')).toBeInTheDocument();
    expect(screen.getByText('Practice Question')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Overfitting')).toBeInTheDocument();
  });

  it('keeps the submit button disabled until an option is selected', () => {
    render(<QuestionCard question={mockQuestion} />);

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    expect(submitBtn).toBeDisabled();

    // Select an option
    const option1 = screen.getByText('High training accuracy but poor validation accuracy');
    fireEvent.click(option1);

    expect(submitBtn).toBeEnabled();
  });

  it('invokes onSubmitAnswer callback with selected option id', () => {
    const handleSubmit = vi.fn();
    render(<QuestionCard question={mockQuestion} onSubmitAnswer={handleSubmit} />);

    // Select option 1
    const option1 = screen.getByText('High training accuracy but poor validation accuracy');
    fireEvent.click(option1);

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith('opt-1');
  });

  it('displays evaluating spinner when isSubmitting is true', () => {
    render(<QuestionCard question={mockQuestion} isSubmitting={true} />);

    expect(screen.getByText(/evaluating/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
  });
});
