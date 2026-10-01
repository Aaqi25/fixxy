import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuestionStage } from '../modules/questions/QuestionStage';

describe('QuestionStage component', () => {
  it('renders Practice Question stage correctly', () => {
    render(<QuestionStage stage="PRACTICE" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Practice Question')).toBeInTheDocument();
  });

  it('renders Targeted Retry stage correctly', () => {
    render(<QuestionStage stage="RETRY" />);
    expect(screen.getByText('Targeted Retry')).toBeInTheDocument();
  });

  it('renders Transfer Scenario stage correctly', () => {
    render(<QuestionStage stage="TRANSFER" />);
    expect(screen.getByText('Transfer Scenario')).toBeInTheDocument();
  });

  it('handles custom fallback stage gracefully', () => {
    render(<QuestionStage stage="CUSTOM_STAGE" />);
    expect(screen.getByText('CUSTOM_STAGE')).toBeInTheDocument();
  });
});
