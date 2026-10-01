import { describe, it, expect } from 'vitest';
import { validateProfileForm } from '../modules/profile/profile.validation';
import type { ProfileFormData } from '../modules/profile/profile.types';

describe('Profile Validation', () => {
  const validForm: ProfileFormData = {
    displayName: 'Ada Lovelace',
    bio: 'Mathematician and writer',
    learningLevel: 'BEGINNER',
    learningGoal: 'Master Machine Learning Fundamentals',
    preferredLearningStyle: 'TEXT',
    preferredLanguage: 'English',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  it('validates a completely valid profile form without errors', () => {
    const errors = validateProfileForm(validForm);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('rejects an empty or whitespace-only display name', () => {
    const errors = validateProfileForm({ ...validForm, displayName: '   ' });
    expect(errors.displayName).toBe('Display name is required');
  });

  it('rejects an oversized display name (>100 characters)', () => {
    const errors = validateProfileForm({ ...validForm, displayName: 'A'.repeat(101) });
    expect(errors.displayName).toBe('Display name cannot exceed 100 characters');
  });

  it('rejects bio longer than 500 characters', () => {
    const errors = validateProfileForm({ ...validForm, bio: 'B'.repeat(501) });
    expect(errors.bio).toBe('Bio cannot exceed 500 characters');
  });

  it('allows empty bio', () => {
    const errors = validateProfileForm({ ...validForm, bio: '' });
    expect(errors.bio).toBeUndefined();
  });

  it('rejects learning goal longer than 500 characters', () => {
    const errors = validateProfileForm({ ...validForm, learningGoal: 'G'.repeat(501) });
    expect(errors.learningGoal).toBe('Learning goal cannot exceed 500 characters');
  });

  it('rejects invalid avatar URL protocol', () => {
    const errors = validateProfileForm({ ...validForm, avatarUrl: 'ftp://bad.com/pic.png' });
    expect(errors.avatarUrl).toBe('Avatar URL must start with http:// or https://');
  });

  it('rejects malformed avatar URL string', () => {
    const errors = validateProfileForm({ ...validForm, avatarUrl: 'not_a_valid_url' });
    expect(errors.avatarUrl).toBe('Please enter a valid web URL (e.g. https://example.com/avatar.jpg)');
  });

  it('allows empty avatar URL', () => {
    const errors = validateProfileForm({ ...validForm, avatarUrl: '' });
    expect(errors.avatarUrl).toBeUndefined();
  });
});
