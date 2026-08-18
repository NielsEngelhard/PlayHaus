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
    /**
     * A third step down, for the uppercase micro-labels that name a section without
     * being part of it — "QUICK PICKS", "STILL RUNNING". Quieter than `textSecondary`,
     * which is body copy.
     */
    textMuted: string,
    background: string,
    backgroundSecondary: string,
    backgroundElement: string,
    backgroundSelected: string,
    /** A shade under the canvas, for sunken surfaces like text inputs. */
    backgroundInput: string,
    /**
     * The outline chrome wears: pills, the bottom bar, the header.
     *
     * The two schemes solve this differently. Light draws a hard ink line and throws a
     * hard ink shadow off it — that contrast is the whole look. Dark cannot: ink on
     * near-black is invisible, so the border steps back to a low grey and the pop comes
     * from a coloured shadow instead (see `popShadow`).
     */
    border: string,
    /** A rung up from `border`, for the raised cards that should read as nearer. */
    borderStrong: string,
    /** A rung down, for chips that should barely be there. */
    borderSubtle: string,
    /** The dashed outline of a slot waiting to be filled. */
    borderDashed: string,
    /**
     * The two tones an option you have *not* picked wears: its outline and its glyph.
     * Both quieter than the chosen one beside them, which is the whole job — a picker
     * has to make the answer obvious without hiding the alternatives.
     */
    borderMuted: string,
    textFaint: string,
    /**
     * The board's own two surfaces: a tile nobody has typed into yet, and the outline
     * around it. Quieter than any card — six rows of empty tiles should read as ruled
     * paper, not as a stack of controls.
     */
    boardEmpty: string,
    boardEmptyBorder: string,
    /**
     * The fill of a letter the word does not contain.
     *
     * The one mark that is not a brand hue: `correct` and `present` are mint and lemon in
     * both schemes, but "not in the word" has to be the darkest thing on a light board and
     * the flattest on a dark one, which are opposite instructions.
     */
    markAbsent: string,
    /**
     * Destructive as *text*, which is not the same red as destructive as a fill.
     * `#E31029` on a near-black canvas vibrates; dark lightens it until it reads as a
     * warning rather than an alarm.
     */
    destructiveText: string,
    /**
     * The colour the app answers a cursor with, and the halo around whatever holds it.
     *
     * Not the same accent in both schemes: on paper the blue is the one that reads as
     * "here", while on the dark canvas it sinks and the lemon is what carries.
     */
    focus: string,
    focusRing: string,
    /** The fill of the one slot being typed into, a step up from its neighbours. */
    backgroundFocus: string,
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
        textSecondary: '#6C6A62',
        textMuted: '#8A8375',
        background: '#FBF7F0',
        // Plain white, not a tinted paper: the canvas carries the warmth, and a card has
        // to lift off it.
        backgroundSecondary: '#FFFFFF',
        backgroundElement: '#F0F0F3',
        backgroundSelected: '#E0E1E6',
        backgroundInput: '#F7EBD8',
        border: '#0F0D12',
        borderStrong: '#0F0D12',
        borderSubtle: 'rgba(15, 13, 18, 0.25)',
        borderDashed: 'rgba(15, 13, 18, 0.3)',
        borderMuted: 'rgba(15, 13, 18, 0.2)',
        textFaint: 'rgba(15, 13, 18, 0.45)',
        boardEmpty: 'rgba(15, 13, 18, 0.045)',
        boardEmptyBorder: 'rgba(15, 13, 18, 0.16)',
        markAbsent: Brand.slate,
        destructiveText: Brand.destructive,
        focus: Brand.secondary,
        focusRing: 'rgba(59, 77, 240, 0.25)',
        backgroundFocus: '#FFFFFF',
        muted: '#EEE7DB',
        scrim: 'rgba(15, 13, 18, 0.45)',
        scrimStrong: 'rgba(15, 13, 18, 0.6)'
    },
    dark: {
        ...Brand,
        text: '#F5F3EF',
        textSecondary: '#9A97A6',
        textMuted: '#7C7A88',
        background: '#0E0E13',
        // Surfaces climb away from the canvas as they come forward, which is what does
        // the separating here — the border is too quiet to do it alone.
        backgroundSecondary: '#17171F',
        backgroundElement: '#14141B',
        backgroundSelected: '#22222B',
        backgroundInput: '#0C0A0F',
        border: '#33333F',
        borderStrong: '#3A3A47',
        borderSubtle: '#2C2C37',
        borderDashed: '#33333F',
        borderMuted: '#33333F',
        textFaint: '#7C7A88',
        boardEmpty: '#15151C',
        boardEmptyBorder: '#26262F',
        markAbsent: '#26262F',
        destructiveText: '#FF7A6E',
        focus: Brand.lemon,
        focusRing: 'rgba(255, 229, 56, 0.25)',
        backgroundFocus: '#1D1D26',
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
 * A three-stop gradient fill, lightest stop first, on the house 160° axis.
 *
 * Every icon tile in the app wears one: a flat accent looks pasted on at 60px and above,
 * and the shading is what makes a tile read as an object rather than a swatch.
 *
 * `midpoint` is where the middle stop lands. The default is the house 55%; the selected
 * word-length tile sits it at 60%, which holds the lemon a beat longer before it turns.
 *
 * `experimental_backgroundImage` is React Native 0.86's own gradient support, so this
 * needs no library — only the web prefix stripped off.
 */
export function linearGradient(stops: readonly [string, string, string], midpoint: number = 55): ViewStyle {
    const gradient = `linear-gradient(160deg, ${stops[0]}, ${stops[1]} ${midpoint}%, ${stops[2]})`;

    return Platform.select<ViewStyle>({
        web: { backgroundImage: gradient } as ViewStyle,
        default: { experimental_backgroundImage: gradient } as ViewStyle
    })!;
}

/** The gradients the app's own icon tiles use, keyed by the accent they are built on. */
export const Gradients = {
    lemon: ['#FFF07A', Brand.lemon, '#EFCE00'],
    primary: ['#FF7A45', Brand.primary, '#E04407'],
    secondary: ['#6C7BFF', Brand.secondary, '#2634C4']
} as const satisfies Record<string, readonly [string, string, string]>;

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
    /**
     * How heavy an outline is. Light draws 2px, dark 1.5px — a full-weight line in a low
     * grey reads as a smudge, and the dark scheme is not relying on the border anyway.
     */
    borderWidth: number,
    shadows: Shadows,
    /**
     * The lift under something that should look like it is sitting above the page.
     *
     * Light stacks a hard ink offset with a soft ambient one, so a card is both cut out
     * and floating. Dark drops the ink entirely — there is nothing darker than the canvas
     * to cast — and throws a hard shadow in `accent` instead, which is what makes a dark
     * card pop rather than dissolve.
     *
     * Pass the colour the element is "about": its game accent, its own fill.
     */
    popShadow: (accent: string) => ViewStyle,
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
 * The canvas behind every page, which is a different idea in each scheme.
 *
 * Light is graph paper: one faint dot, tiled every 22px. Dark is unlit, with two soft
 * washes of the brand colours bled into opposite corners — a dot grid on near-black
 * would read as dust.
 *
 * The tiling is why this returns three properties rather than one. React Native 0.86
 * carries `experimental_backgroundSize` / `_backgroundRepeat` alongside
 * `experimental_backgroundImage`, so the same pattern works on device and on web with
 * nothing but a prefix between them.
 */
function pageCanvas(scheme: Scheme): { image: string, size: string, repeat: string } {
    if (scheme === 'dark') {
        return {
            image:
                'radial-gradient(circle at 15% 12%, rgba(254, 90, 29, 0.20) 0%, transparent 40%), ' +
                'radial-gradient(circle at 85% 80%, rgba(59, 77, 240, 0.22) 0%, transparent 44%)',
            size: 'auto',
            repeat: 'no-repeat'
        };
    }

    return {
        image: 'radial-gradient(rgba(15, 13, 18, 0.09) 1px, transparent 1px)',
        size: '22px 22px',
        repeat: 'repeat'
    };
}

function buildTheme(scheme: Scheme): Theme {
    const colors = Colors[scheme];
    const canvas = pageCanvas(scheme);
    const dark = scheme === 'dark';

    const borderWidth = dark ? 1.5 : 2;

    // In dark these paint in the low-grey border colour, which is nearly nothing — the
    // scheme's lift comes from `popShadow` instead. Kept rather than removed so every
    // component that reaches for a standard offset still resolves to something.
    const shadows: Shadows = {
        hard: hardShadow(3, colors.border),
        hardSmall: hardShadow(2, colors.border),
        hardLarge: hardShadow(5, colors.border)
    };

    const popShadow = (accent: string): ViewStyle => ({
        boxShadow: dark
            ? `3px 3px 0 0 ${accent}`
            : `3px 3px 0 0 ${colors.border}, 0 16px 28px -18px rgba(15, 13, 18, 0.5)`
    });

    return {
        scheme,
        colors,
        borderWidth,
        shadows,
        popShadow,
        solidButton: {
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth,
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
                web: {
                    backgroundImage: canvas.image,
                    backgroundSize: canvas.size,
                    backgroundRepeat: canvas.repeat
                },
                default: {
                    experimental_backgroundImage: canvas.image,
                    experimental_backgroundSize: canvas.size,
                    experimental_backgroundRepeat: canvas.repeat
                },
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
export const BottomBarHeight = 60;
export const MaxContentWidth = 800;
