import type { Theme } from '@/constants/theme';
import { useTheme } from '@/features/theme/ThemeContext';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * The themed replacement for a module-level `StyleSheet.create`.
 *
 * `StyleSheet.create` copies the values it is handed, so a sheet built at module load
 * is fixed at whatever colours were current then — which is the whole reason a
 * hardcoded palette could never switch. Wrapping the sheet in a function of the theme
 * defers that copy until a scheme is known.
 *
 * Swap a component's stylesheet over like this:
 *
 * ```ts
 * const useStyles = createThemedStyles(theme => ({
 *     label: { color: theme.colors.textSecondary }
 * }));
 *
 * export default function Label() {
 *     const styles = useStyles();
 *     ...
 * }
 * ```
 *
 * The sheets are cached per scheme in the closure, so each one is built at most twice
 * for the life of the process no matter how many components mount — the cost is the
 * same as the module-level call it replaces, just paid on first render instead of on
 * first import.
 */
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
