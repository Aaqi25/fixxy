import type { ContentType, DifficultyLevel } from './curriculum.types';

export function formatDifficulty(level: DifficultyLevel): {
  label: string;
  className: string;
  badgeStyle: React.CSSProperties;
} {
  switch (level) {
    case 'BEGINNER':
      return {
        label: 'Beginner',
        className: 'badge-beginner',
        badgeStyle: {
          backgroundColor: 'rgba(26, 114, 69, 0.12)',
          color: '#1a7245',
          border: '1px solid rgba(26, 114, 69, 0.25)',
        },
      };
    case 'INTERMEDIATE':
      return {
        label: 'Intermediate',
        className: 'badge-intermediate',
        badgeStyle: {
          backgroundColor: 'rgba(32, 70, 115, 0.12)',
          color: '#193650',
          border: '1px solid rgba(32, 70, 115, 0.25)',
        },
      };
    case 'ADVANCED':
      return {
        label: 'Advanced',
        className: 'badge-advanced',
        badgeStyle: {
          backgroundColor: 'rgba(198, 42, 71, 0.12)',
          color: '#c62a47',
          border: '1px solid rgba(198, 42, 71, 0.25)',
        },
      };
    default:
      return {
        label: level,
        className: 'badge-default',
        badgeStyle: {
          backgroundColor: 'rgba(61, 90, 122, 0.12)',
          color: '#3d5a7a',
          border: '1px solid rgba(61, 90, 122, 0.25)',
        },
      };
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function formatDisplayOrder(order: number): string {
  return order < 10 ? `0${order}` : `${order}`;
}

export function getContentSectionMeta(type: ContentType): {
  icon: string;
  label: string;
  accentColor: string;
  bgTint: string;
} {
  switch (type) {
    case 'OVERVIEW':
      return {
        icon: '📖',
        label: 'Overview',
        accentColor: '#193650',
        bgTint: 'rgba(25, 54, 80, 0.03)',
      };
    case 'KEY_IDEA':
      return {
        icon: '💡',
        label: 'Key Idea',
        accentColor: '#0c5460',
        bgTint: 'rgba(12, 84, 96, 0.05)',
      };
    case 'ANALOGY':
      return {
        icon: '🎯',
        label: 'Intuition & Analogy',
        accentColor: '#6f42c1',
        bgTint: 'rgba(111, 66, 193, 0.05)',
      };
    case 'EXAMPLE':
      return {
        icon: '🧪',
        label: 'Concrete Example',
        accentColor: '#1a7245',
        bgTint: 'rgba(26, 114, 69, 0.04)',
      };
    case 'COMMON_MISTAKE':
      return {
        icon: '⚠️',
        label: 'Common Misconception',
        accentColor: '#c62a47',
        bgTint: 'rgba(198, 42, 71, 0.05)',
      };
    case 'SUMMARY':
      return {
        icon: '✨',
        label: 'Summary & Takeaways',
        accentColor: '#204673',
        bgTint: 'rgba(32, 70, 115, 0.04)',
      };
    default:
      return {
        icon: '📝',
        label: type,
        accentColor: '#3d5a7a',
        bgTint: 'transparent',
      };
  }
}
