// オヤカツ デザインテーマ

export const colors = {
  // プライマリカラー
  primary: '#FF6B6B',
  primaryDark: '#E55A5A',
  primaryLight: '#FF8A8A',

  // セカンダリカラー
  secondary: '#4ECDC4',
  secondaryDark: '#3DBDB4',
  secondaryLight: '#6FE0D8',

  // 背景色
  background: '#FFFFFF',
  backgroundSecondary: '#F7F7F7',
  backgroundTertiary: '#EFEFEF',

  // テキスト色
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#888888',
  textInverse: '#FFFFFF',

  // ステータス色
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  // その他
  border: '#E0E0E0',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// 称号の色
export const titleColors = {
  watcher: '#888888',     // 見守り隊
  supporter: '#4ECDC4',   // 心の支え
  super_fan: '#FFD700',   // 神推し
} as const;

// 称号のアイコン
export const titleIcons = {
  watcher: '👀',
  supporter: '💖',
  super_fan: '🎖️',
} as const;
