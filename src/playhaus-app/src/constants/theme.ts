/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#0F0D12',
    background: '#ffffff',
    backgroundSecondary: '#FEFCF4',
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
  xl: 24,
  huge: 48
}

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Outfit ships as one static file per weight (there is no variable cut), so each
 * weight registers as its own font family. That means `fontWeight` on its own does
 * nothing once a custom `fontFamily` is set — the family name has to carry the
 * weight. Use `fontFamilyForWeight()`, or just render text through the `AppText`
 * component, which applies this for you.
 *
 * Only the weights listed here are loaded in `src/app/_layout.tsx`. To add one,
 * add it in both places — an unloaded family silently falls back to the system font.
 */
export const Fonts = {
  400: 'Outfit_400Regular',
  500: 'Outfit_500Medium',
  700: 'Outfit_700Bold',
  900: 'Outfit_900Black',
} as const;

export type FontWeight = keyof typeof Fonts;

const LoadedWeights = Object.keys(Fonts).map(Number) as FontWeight[];

/**
 * Resolve any React Native `fontWeight` to a loaded Outfit family, snapping to the
 * nearest available weight (600 -> 700, 300 -> 400, ...).
 */
export function fontFamilyForWeight(weight: TextStyle['fontWeight']): string {
  if (weight == null) return Fonts[400];
  if (weight === 'normal') return Fonts[400];
  if (weight === 'bold') return Fonts[700];

  const numeric = typeof weight === 'number' ? weight : Number(weight);
  if (!Number.isFinite(numeric)) return Fonts[400];

  const nearest = LoadedWeights.reduce((best, candidate) =>
    Math.abs(candidate - numeric) < Math.abs(best - numeric) ? candidate : best
  );
  return Fonts[nearest];
}

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Build a hard shadow: `<offset>px <offset>px 0 0 <color>`. */
export const hardShadow = (offset: number = 3, color: string = Colors.light.border): ViewStyle => ({
  boxShadow: `${offset}px ${offset}px 0 0 ${color}`,
});

export const Shadows = {
  hard: hardShadow(),
  hardSmall: hardShadow(2),
  hardLarge: hardShadow(5),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
