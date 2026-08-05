/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#0F0D12',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: "#0F0D12",
    
    lemon: "#FFE538",      
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export const FontSizes = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24
}

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Hard (neo-brutalist) offset shadows, equivalent to the Tailwind utility
 * `--tw-shadow: 3px 3px 0 0 var(--tw-shadow-color, var(--ink))`.
 *
 * These use the CSS-compatible `boxShadow` style prop instead of the legacy
 * `shadow*` / `elevation` props, so one value renders identically everywhere:
 * - iOS + Android: supported natively on the New Architecture (default in Expo SDK 54+).
 * - Web: react-native-web passes the string through to CSS `box-shadow`
 *   (it also deprecates the `shadow*` props in favour of this one).
 *
 * Notes:
 * - Android draws outset shadows from the view's outline, so the view needs a
 *   `backgroundColor` (and a matching `borderRadius`) for the shadow to show.
 * - Android 9+ (API 28) is required; older devices simply render no shadow
 *   rather than the blurred, non-offset `elevation` shadow.
 */
const Ink = Colors.light.border;

/** Build a hard shadow: `<offset>px <offset>px 0 0 <color>`. */
export const hardShadow = (offset: number = 3, color: string = Ink): ViewStyle => ({
  boxShadow: `${offset}px ${offset}px 0 0 ${color}`,
});

export const Shadows = {
  hard: hardShadow(),
  hardSmall: hardShadow(2),
  hardLarge: hardShadow(5),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
