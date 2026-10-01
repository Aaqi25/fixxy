import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuestionOptions } from '../modules/questions/QuestionOptions';
import type { QuestionOption } from '../modules/questions/question.types';

const mockOptions: QuestionOption[] = [
  { id: 'opt-1', text: 'First option text', displayOrder: 1 },
  { id: 'opt-2', text: 'Second option text', displayOrder: 2 },
  { id: 'opt-3', text: 'Third option text', displayOrder: 3 },
  { id: 'opt-4', text: 'Fourth option text', displayOrder: 4 },
];

describe('QuestionOptions component', () => {
  it('renders all options with letters A, B, C, D', () => {
    render(
      <QuestionOptions
        options={mockOptions}
        selectedOptionId={null}
        onSelectOption={() => {}}
      />
    );

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByText('First option text')).toBeInTheDocument();
    expect(screen.getByText('Second option text')).toBeInTheDocument();
    expect(screen.getByText('Third option text')).toBeInTheDocument();
    expect(screen.getByText('Fourth option text')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('handles mouse click to select an option', () => {
    const handleSelect = vi.fn();
    render(
      <QuestionOptions
        options={mockOptions}
        selectedOptionId="opt-2"
        onSelectOption={handleSelect}
      />
    );

    const radio1 = screen.getByText('First option text');
    fireEvent.click(radio1);
    expect(handleSelect).toHaveBeenCalledWith('opt-1');
  });

  it('marks the selected option as checked in aria attribute', () => {
    const { container } = render(
      <QuestionOptions
        options={mockOptions}
        selectedOptionId="opt-3"
        onSelectOption={() => {}}
      />
    );

    const option3 = container.querySelector('#option-opt-3');
    expect(option3).toHaveAttribute('aria-checked', 'true');

    const option1 = container.querySelector('#option-opt-1');
    expect(option1).toHaveAttribute('aria-checked', 'false');
  });

  it('supports keyboard navigation with ArrowDown and Space keys', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <QuestionOptions
        options={mockOptions}
        selectedOptionId="opt-1"
        onSelectOption={handleSelect}
      />
    );

    const option1 = container.querySelector('#option-opt-1')!;
    fireEvent.keyDown(option1, { key: 'ArrowDown' });
    expect(handleSelect).toHaveBeenCalledWith('opt-2');

    fireEvent.keyDown(option1, { key: ' ' });
    expect(handleSelect).toHaveBeenCalledWith('opt-1');
  });

  it('prevents selection when disabled', () => {
    const handleSelect = vi.fn();
    render(
      <QuestionOptions
        options={mockOptions}
        selectedOptionId={null}
        onSelectOption={handleSelect}
        disabled={true}
      />
    );

    const radio1 = screen.getByText('First option text');
    fireEvent.click(radio1);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
