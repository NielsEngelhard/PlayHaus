import { fontFamilyForWeight } from '@/constants/theme';
import { StyleSheet, Text, type TextProps } from 'react-native';

/**
 * Drop-in replacement for React Native's `Text` that renders in Outfit.
 *
 * React Native has no global font cascade, so every piece of text has to opt in —
 * use this component instead of importing `Text` from `react-native` directly.
 *
 * `fontWeight` is read off the incoming style and translated into the matching
 * Outfit family, then removed. Leaving it set would make the platform synthesise a
 * faux-bold on top of a cut that is already bold, which renders noticeably heavier
 * and blurrier than the real thing.
 */
export default function AppText({ style, ...rest }: TextProps) {
  const { fontWeight, ...base } = StyleSheet.flatten(style) ?? {};

  return <Text {...rest} style={[base, { fontFamily: fontFamilyForWeight(fontWeight) }]} />;
}
