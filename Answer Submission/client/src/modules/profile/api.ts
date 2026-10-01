import type {
  ApiProfileResponse,
  ApiUpdateProfileResponse,
  ProfileFormData,
  StudentProfile,
} from './profile.types';

const API_BASE = '/api';

interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string>;
}

async function profileFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      let body: any = {};
      try {
        body = await res.json();
      } catch {
        // Body was not JSON
      }

      const error: ApiError = {
        message: body.message || (path.includes('PUT') ? "Couldn't update your profile. Please try again." : "Couldn't load your profile. Please try again."),
        status: res.status,
        errors: body.errors,
      };
      throw error;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err.status) {
      throw err;
    }
    // Network / connection error
    const netError: ApiError = {
      message: "Couldn't connect to FIXXY.",
      status: 0,
    };
    throw netError;
  }
}

/**
 * GET /api/profile
 */
export async function getProfile(): Promise<StudentProfile> {
  const data = await profileFetch<ApiProfileResponse>('/profile', {
    method: 'GET',
  });
  return data.profile;
}

/**
 * PUT /api/profile
 */
export async function updateProfile(
  formData: ProfileFormData
): Promise<ApiUpdateProfileResponse> {
  return profileFetch<ApiUpdateProfileResponse>('/profile', {
    method: 'PUT',
    body: JSON.stringify({
      displayName: formData.displayName.trim(),
      bio: formData.bio.trim() ? formData.bio.trim() : null,
      learningLevel: formData.learningLevel,
      learningGoal: formData.learningGoal.trim() ? formData.learningGoal.trim() : null,
      preferredLearningStyle: formData.preferredLearningStyle,
      preferredLanguage: formData.preferredLanguage,
      avatarUrl: formData.avatarUrl.trim() ? formData.avatarUrl.trim() : null,
    }),
  });
}
