import { fontFamilyForWeight } from '@/constants/theme';
import { StyleSheet, Text, type TextProps } from 'react-native';

// Drop-in replacement for React Native's `Text` that renders in Outfit.
export default function AppText({ style, ...rest }: TextProps) {
  const { fontWeight, ...base } = StyleSheet.flatten(style) ?? {};

  return <Text {...rest} style={[base, { fontFamily: fontFamilyForWeight(fontWeight) }]} />;
}
