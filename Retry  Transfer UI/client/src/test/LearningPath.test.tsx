import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LearningPath } from '../modules/curriculum/LearningPath';
import type { LearningPathNode } from '../modules/curriculum/curriculum.types';

const mockNodes: LearningPathNode[] = [
  {
    id: 'n-1',
    slug: 'train-validation-test',
    title: 'Train / Validation / Test',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 15,
    displayOrder: 1,
    prerequisites: [],
  },
  {
    id: 'n-2',
    slug: 'overfitting',
    title: 'Overfitting',
    difficultyLevel: 'BEGINNER',
    estimatedMinutes: 15,
    displayOrder: 2,
    prerequisites: [{ id: 'n-1', slug: 'train-validation-test', title: 'Train / Validation / Test' }],
  },
];

describe('LearningPath component', () => {
  it('returns null when nodes array is empty', () => {
    const { container } = render(<LearningPath nodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all learning path nodes, steps, and prerequisite indicators', () => {
    render(
      <MemoryRouter>
        <LearningPath nodes={mockNodes} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /recommended learning path/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Step 01')).toBeInTheDocument();
    expect(screen.getByText('Step 02')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Train / Validation / Test' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overfitting' })).toBeInTheDocument();

    // Check foundation vs prerequisite
    expect(screen.getByText(/foundation \(start here\)/i)).toBeInTheDocument();
    expect(screen.getByText(/prerequisite:/i)).toBeInTheDocument();
  });
});
