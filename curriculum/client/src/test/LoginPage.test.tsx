import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../modules/auth/LoginPage';
import { AuthContext } from '../modules/auth/AuthContext';

const mockLogin = vi.fn();
const mockClearError = vi.fn();

function renderLoginPage(overrides = {}) {
  const contextValue = {
    student: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearError: mockClearError,
    ...overrides,
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={contextValue}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

function getEmailInput() { return document.getElementById('login-email') as HTMLInputElement; }
function getPasswordInput() { return document.getElementById('login-password') as HTMLInputElement; }
function getSubmitButton() { return document.getElementById('login-submit') as HTMLButtonElement; }

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields and submit button', () => {
    renderLoginPage();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it('renders a link to register', () => {
    renderLoginPage();
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation error when email is empty on submit', async () => {
    renderLoginPage();
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when password is empty on submit', async () => {
    renderLoginPage();
    fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    renderLoginPage();
    fireEvent.change(getEmailInput(), { target: { value: 'notanemail' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'Password123' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('calls login with trimmed email and password on valid submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLoginPage();
    fireEvent.change(getEmailInput(), { target: { value: '  student@example.com  ' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'Password123' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('student@example.com', 'Password123');
    });
  });

  it('shows server error banner when error is present in context', () => {
    renderLoginPage({ error: 'Invalid email or password' });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('disables submit button when submitting', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderLoginPage();
    fireEvent.change(getEmailInput(), { target: { value: 'test@example.com' } });
    fireEvent.change(getPasswordInput(), { target: { value: 'Password123' } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });
  });
});
