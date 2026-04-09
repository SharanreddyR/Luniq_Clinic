/** Healthcare theme — primary teal, deep secondary for contrast */
export const colors = {
  primary: '#2ebdb4',
  secondary: '#062d2f',
  background: '#f4faf9',
  surface: '#ffffff',
  surfaceVariant: '#e8f5f3',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  text: '#0d1f1e',
  textMuted: '#5a726f',
  border: '#c5ddd9',
  error: '#b3261e',
  success: '#1b7a6c',
} as const;

export type AppColors = typeof colors;
