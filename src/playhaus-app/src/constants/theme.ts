/**
 * The app's design system: one palette per colour scheme, and the chrome built on top
 * of it.
 *
 * Nothing here is a colour a component reads directly. `StyleSheet.create` copies the
 * values it is handed at module load, so a stylesheet that reached into a palette would
 * be frozen at whichever scheme was current when its file was first imported — which is
 * to say, frozen forever. Components ask for the live theme instead, through
 * `createThemedStyles` / `useTheme` in `@/features/theme`, and the one place that decides
 * light or dark is `ThemeProvider`.
 *
 * The exception is `Brand`, below: hues that are the same in both schemes and so are
 * safe to read at module scope.
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export type Scheme = 'light' | 'dark';

/**
 * The hues that mean the same thing in both schemes.
 *
 * An avatar's colour, a game's accent, a scored tile — these are identities rather than
 * surfaces. A player who picked the orange one has the orange one at midnight too, so
 * these must not flip, and anything that needs them at module scope (`games.ts`,
 * `marks.ts`, `profile.ts`) may read them straight from here.
 */
export const Brand = {
    primary: '#FE5A1D',
    secondary: '#3B4DF0',
    lemon: '#FFE538',
    mint: '#73ECBC',
    blush: '#FFBEB8',
    available: '#31AA40',
    /** Warnings and irreversible actions. Loud on purpose — use it sparingly. */
    destructive: '#E31029',
    /** Paper. What stays readable on top of any of the fills above. */
    textOnAccent: '#FEFBF8',
    /** Ink, as a fill rather than as text — the darkest avatar swatch wears this. */
    ink: '#0F0D12',
    /** The struck-out grey a spent letter tile wears, in either scheme. */
    slate: '#4B4C58'
} as const;

/**
 * Every colour that has to answer differently in light and dark.
 *
 * Both schemes carry the whole set — the type below is what enforces that, so a token
 * added to one is a compile error until it is added to the other.
 */
export interface Palette {
    text: string,
    textSecondary: string,
    background: string,
    backgroundSecondary: string,
    backgroundElement: string,
    backgroundSelected: string,
    /** A shade under the canvas, for sunken surfaces like text inputs. */
    backgroundInput: string,
    /**
     * The hard outline every piece of chrome wears, and the colour its shadow paints in.
     *
     * This is the app's signature and it inverts: ink on paper in light, paper on ink in
     * dark. A black border on a near-black canvas would simply be gone, taking the whole
     * look with it.
     */
    border: string,
    /** Flat fill for the "off" half of a control, where nothing is happening yet. */
    muted: string,
    /**
     * The wash behind a modal, and the heavier one behind the auth sheet.
     *
     * Darker in dark mode rather than lighter: a scrim's job is to push the page back,
     * and an ink wash at the same strength over a near-black canvas would barely
     * register as one.
     */
    scrim: string,
    scrimStrong: string,

    primary: string,
    secondary: string,
    lemon: string,
    mint: string,
    blush: string,
    available: string,
    destructive: string,
    textOnAccent: string
}

/**
 * Deliberately not exported. The palettes are raw material for `Themes` below, and a
 * component that could reach `Colors.light` directly is a component that has picked a
 * scheme by hand and will never change out of it — the exact bug this structure exists
 * to make impossible. Go through `useTheme()` / `createThemedStyles()`, or `Brand` for
 * the hues that genuinely don't move.
 */
const Colors: Record<Scheme, Palette> = {
    light: {
        ...Brand,
        text: '#0F0D12',
        textSecondary: '#4B4C58',
        background: '#FEF5E6',
        backgroundSecondary: '#FEFCF4',
        backgroundElement: '#F0F0F3',
        backgroundSelected: '#E0E1E6',
        backgroundInput: '#F7EBD8',
        border: '#0F0D12',
        muted: '#EEE7DB',
        scrim: 'rgba(15, 13, 18, 0.45)',
        scrimStrong: 'rgba(15, 13, 18, 0.6)'
    },
    dark: {
        ...Brand,
        // Warm rather than pure white, so the ink/paper relationship survives the flip
        // instead of turning the app cold.
        text: '#F7F3EC',
        textSecondary: '#A9A3B4',
        // Near-black with the same violet lean the light scheme's ink has.
        background: '#131117',
        // Surfaces climb away from the canvas as they come forward, which is what keeps
        // a card readable as a card once the border is no longer the darkest thing on it.
        backgroundSecondary: '#1D1A22',
        backgroundElement: '#26232C',
        backgroundSelected: '#33303A',
        // Still a shade *under* the canvas, like its light counterpart — sunken means
        // darker in both schemes, it is only the canvas that moved.
        backgroundInput: '#0C0A0F',
        border: '#F2EFE9',
        muted: '#2E2A35',
        scrim: 'rgba(0, 0, 0, 0.6)',
        scrimStrong: 'rgba(0, 0, 0, 0.75)'
    }
};

export const FontSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 30,
    xxxl: 36,
    huge: 48
}

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

/**
 * Build a hard shadow: `<offset>px <offset>px 0 0 <color>`.
 *
 * The colour is required rather than defaulted, because the only sensible default is
 * the current scheme's border and this file has no way to know which that is. Pass
 * `theme.colors.border`, or reach for `theme.shadows` where a standard offset will do.
 */
export const hardShadow = (offset: number, color: string): ViewStyle => ({
    boxShadow: `${offset}px ${offset}px 0 0 ${color}`,
});

export interface Shadows {
    hard: ViewStyle,
    hardSmall: ViewStyle,
    hardLarge: ViewStyle
}

/**
 * Which fill a solid button wears. Only the colour changes — every variant keeps the
 * border, shadow and label treatment `theme.solidButton` lays down, so a row of them
 * still reads as one family.
 *
 * `muted` is for the option someone should be able to find but not be pushed towards.
 * `neutral` steps back further still — it takes no accent colour at all, for a control
 * that has to be present on a page it is not the point of.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'muted' | 'neutral';

export interface ButtonVariantStyle {
    fill: string,
    label: string
}

/**
 * One scheme's worth of the design system: its palette, plus everything derived from it.
 *
 * Built twice at module load (see `Themes`) rather than per render — the values only
 * depend on the palette, so there are exactly two of these for the life of the process.
 */
export interface Theme {
    scheme: Scheme,
    colors: Palette,
    shadows: Shadows,
    /**
     * The chrome shared by the app's solid buttons: hard border, hard shadow, accent
     * fill. Lives here rather than in `TextButton` because `BackButton` wears the same
     * look and the two have to stay identical.
     */
    solidButton: ViewStyle,
    buttonVariants: Record<ButtonVariant, ButtonVariantStyle>,
    pageBackground: ViewStyle
}

/**
 * The two soft washes behind every page. A touch stronger on dark, where the same alpha
 * over near-black is very nearly nothing.
 */
function pageGradient(scheme: Scheme): string {
    const [warm, cool] = scheme === 'dark' ? [0.2, 0.17] : [0.14, 0.12];

    return (
        `radial-gradient(circle at 12% 18%, rgba(254, 90, 29, ${warm}) 0%, transparent 38%), ` +
        `radial-gradient(circle at 88% 82%, rgba(59, 77, 240, ${cool}) 0%, transparent 42%)`
    );
}

function buildTheme(scheme: Scheme): Theme {
    const colors = Colors[scheme];
    const gradient = pageGradient(scheme);

    const shadows: Shadows = {
        hard: hardShadow(3, colors.border),
        hardSmall: hardShadow(2, colors.border),
        hardLarge: hardShadow(5, colors.border)
    };

    return {
        scheme,
        colors,
        shadows,
        solidButton: {
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: 14,
            backgroundColor: colors.secondary,
            paddingHorizontal: Spacing.four,
            paddingVertical: Spacing.two + Spacing.one,
            ...shadows.hard
        },
        buttonVariants: {
            primary: { fill: colors.primary, label: colors.textOnAccent },
            secondary: { fill: colors.secondary, label: colors.textOnAccent },
            // The pale fills can't carry light text, so these flip to the normal colour.
            muted: { fill: colors.muted, label: colors.text },
            neutral: { fill: colors.backgroundSecondary, label: colors.text }
        },
        pageBackground: {
            backgroundColor: colors.background,
            ...Platform.select({
                web: { backgroundImage: gradient },
                default: { experimental_backgroundImage: gradient },
            }),
        }
    };
}

/** Both schemes, built once. `useTheme()` hands out one of these two objects. */
export const Themes: Record<Scheme, Theme> = {
    light: buildTheme('light'),
    dark: buildTheme('dark')
};

/**
 * Height of the floating bottom bar. It overlays the page rather than shrinking it,
 * so any scrollable content has to pad past this to stay reachable.
 */
export const BottomBarHeight = 64;
export const MaxContentWidth = 800;
