import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '../modules/profile/ProfilePage';
import { AuthContext } from '../modules/auth/AuthContext';
import * as profileApi from '../modules/profile/api';
import type { StudentProfile } from '../modules/profile/profile.types';

// Mock profile API module
vi.mock('../modules/profile/api');

const mockStudent = {
  id: 'student-12345-uuid',
  name: 'Ada Lovelace',
  email: 'ada@fixxy.edu',
};

const sampleProfile: StudentProfile = {
  displayName: 'Ada Lovelace',
  bio: 'Pioneer programmer',
  learningLevel: 'BEGINNER',
  learningGoal: 'Master AI & ML',
  preferredLearningStyle: 'TEXT',
  preferredLanguage: 'English',
  avatarUrl: null,
};

function renderProfilePage(authOverrides = {}) {
  const contextValue = {
    student: mockStudent,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearError: vi.fn(),
    ...authOverrides,
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={contextValue}>
        <ProfilePage />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially while fetching profile', () => {
    vi.mocked(profileApi.getProfile).mockReturnValue(new Promise(() => {})); // Never resolves
    renderProfilePage();

    expect(screen.getByText(/loading your profile\.\.\./i)).toBeInTheDocument();
  });

  it('renders profile card and preferences once loaded', async () => {
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByText(/loading your profile\.\.\./i)).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('Pioneer programmer')).toBeInTheDocument();
    expect(screen.getByText(/ada@fixxy\.edu/i)).toBeInTheDocument();
    expect(screen.getByText(/Learning Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Master AI & ML/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit student profile/i })).toBeInTheDocument();
  });

  it('displays fetch error message and offers retry button on load failure', async () => {
    vi.mocked(profileApi.getProfile).mockRejectedValue(new Error("Couldn't load your profile. Please try again."));
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText(/couldn't load your profile\. please try again\./i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    // Clicking retry calls getProfile again
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });
  });

  it('switches to edit mode with pre-populated form when Edit Profile is clicked', async () => {
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /edit student profile/i });
    fireEvent.click(editBtn);

    // Form fields should be rendered and populated
    const nameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    const bioInput = screen.getByLabelText(/bio/i) as HTMLTextAreaElement;
    const goalInput = screen.getByLabelText(/learning goal/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Ada Lovelace');
    expect(bioInput.value).toBe('Pioneer programmer');
    expect(goalInput.value).toBe('Master AI & ML');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('cancels edit mode and restores view mode without saving', async () => {
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit student profile/i }));

    const nameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Back in view mode with original name
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(profileApi.updateProfile).not.toHaveBeenCalled();
  });

  it('shows client-side validation error when submitting blank display name', async () => {
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit student profile/i }));

    const nameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
    });

    expect(profileApi.updateProfile).not.toHaveBeenCalled();
  });

  it('saves updated profile successfully and displays success feedback banner', async () => {
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    const updatedProfile: StudentProfile = {
      ...sampleProfile,
      displayName: 'Ada Lovelace Updated',
      learningLevel: 'ADVANCED',
    };
    vi.mocked(profileApi.updateProfile).mockResolvedValue({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit student profile/i }));

    const nameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Ada Lovelace Updated' } });

    const levelSelect = screen.getByLabelText(/learning level/i) as HTMLSelectElement;
    fireEvent.change(levelSelect, { target: { value: 'ADVANCED' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Ada Lovelace Updated' })).toBeInTheDocument();
  });

  it('handles save error and displays server error message in form', async () => {
    vi.mocked(profileApi.getProfile).mockResolvedValue(sampleProfile);
    vi.mocked(profileApi.updateProfile).mockRejectedValue({
      status: 400,
      message: "Couldn't update your profile. Please try again.",
      errors: { displayName: 'Name rejected by server' },
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit student profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/name rejected by server/i)).toBeInTheDocument();
    });
  });

  it('handles network disconnection gracefully', async () => {
    vi.mocked(profileApi.getProfile).mockRejectedValue({
      status: 0,
      message: "Couldn't connect to FIXXY.",
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText(/couldn't connect to fixxy\./i)).toBeInTheDocument();
    });
  });
});
