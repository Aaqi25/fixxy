import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { AuthContext } from '../modules/auth/AuthContext';

const mockRegister = vi.fn();
const mockClearError = vi.fn();

function renderRegisterPage(overrides = {}) {
  const contextValue = {
    student: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: mockRegister,
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearError: mockClearError,
    ...overrides,
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={contextValue}>
        <RegisterPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function getConfirmInput() {
  return document.getElementById('register-confirm') as HTMLInputElement;
}

function getSubmitButton() {
  return document.getElementById('register-submit') as HTMLButtonElement;
}

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all form fields and submit button', () => {
    renderRegisterPage();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(document.getElementById('register-confirm')).toBeInTheDocument();
    expect(document.getElementById('register-submit')).toBeInTheDocument();
  });

  it('renders a link to sign in', () => {
    renderRegisterPage();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    renderRegisterPage();
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'bad-email' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.change(getConfirmInput(), { target: { value: 'Password123' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for weak password', async () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'weak' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when passwords do not match', async () => {
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.change(getConfirmInput(), { target: { value: 'DifferentPass1' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  it('calls register with correct arguments on valid submit', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    renderRegisterPage();
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.change(getConfirmInput(), { target: { value: 'Password123' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Ada Lovelace', 'ada@example.com', 'Password123', 'Password123');
    });
  });

  it('shows duplicate email error from context', () => {
    renderRegisterPage({ error: 'Email is already registered. Try signing in instead.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/already registered/i);
  });
});
