import type { Theme } from '@/constants/theme';
import { useTheme } from '@/features/theme/ThemeContext';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

// The themed replacement for a module-level `StyleSheet.create`.
export function createThemedStyles<T extends NamedStyles>(factory: (theme: Theme) => T): () => T {
    const cache = new Map<Theme['scheme'], T>();

    return function useThemedStyles(): T {
        const theme = useTheme();

        const cached = cache.get(theme.scheme);
        if (cached !== undefined) return cached;

        const styles = StyleSheet.create(factory(theme));
        cache.set(theme.scheme, styles);

        return styles;
    };
}
