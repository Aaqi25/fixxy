import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '../components/shared/NotFoundPage';

describe('NotFoundPage', () => {
  it('renders 404 code and description', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByLabelText(/error 404/i)).toBeInTheDocument();
    expect(screen.getByText(/wrong turn/i)).toBeInTheDocument();
    expect(screen.getByText(/learning path/i)).toBeInTheDocument();
  });

  it('renders a link back to FIXXY', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /back to fixxy/i })).toBeInTheDocument();
  });
});
