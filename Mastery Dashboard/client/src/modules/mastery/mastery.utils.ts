import type { MasteryLevel } from './mastery.types';

export function getLevelLabel(level: MasteryLevel): string {
  switch (level) {
    case 'NOT_STARTED':
      return 'Not Started';
    case 'BEGINNER':
      return 'Beginner';
    case 'DEVELOPING':
      return 'Developing';
    case 'PROFICIENT':
      return 'Proficient';
    default:
      return 'Not Started';
  }
}

export function getLevelBadgeClass(level: MasteryLevel): string {
  switch (level) {
    case 'PROFICIENT':
      return 'badge-success';
    case 'DEVELOPING':
      return 'badge-info';
    case 'BEGINNER':
      return 'badge-warning';
    case 'NOT_STARTED':
    default:
      return 'badge-neutral';
  }
}

export function getLevelColor(level: MasteryLevel): string {
  switch (level) {
    case 'PROFICIENT':
      return '#16a34a'; // emerald green
    case 'DEVELOPING':
      return '#2563eb'; // royal blue
    case 'BEGINNER':
      return '#d97706'; // amber
    case 'NOT_STARTED':
    default:
      return '#64748b'; // slate grey
  }
}

export function getProgressGradient(score: number): string {
  if (score >= 70) {
    return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
  }
  if (score >= 40) {
    return 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)';
  }
  if (score > 0) {
    return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
  }
  return 'linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%)';
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'No activity yet';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) {
    return 'Just now';
  }

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
