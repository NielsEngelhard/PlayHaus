// The app's design system: one palette per colour scheme, and the chrome built on top of it.

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export type Scheme = 'light' | 'dark';

// The hues that mean the same thing in both schemes.
export const Brand = {
    primary: '#FE5A1D',
    secondary: '#3B4DF0',
    lemon: '#FFE538',
    mint: '#73ECBC',
    pink: '#FFBEB8',
    // Pale enough that it is the one accent in the set that cannot carry paper text.
    violet: '#C7B9FF',
    blush: '#FFBEB8',
    available: '#31AA40',
    /** Warnings and irreversible actions. Loud on purpose — use it sparingly. */
    destructive: '#E31029',
    /** Paper. What stays readable on top of any of the fills above. */
    textOnAccent: '#FEFBF8',
    /** Ink, as a fill rather than as text — the darkest avatar swatch wears this. */
    ink: '#0F0D12',
    /** The struck-out grey a spent letter tile wears, in either scheme. */
    slate: '#4B4C58',
    // A neutral the game accents never touch, for the one card in One of Us that has to say nothing rather than something.
    fog: '#DCDCE4'
} as const;

// Every colour that has to answer differently in light and dark.
export interface Palette {
    text: string,
    textSecondary: string,
    // A third step down, for the uppercase micro-labels that name a section without being part of it.
    textMuted: string,
    background: string,
    backgroundSecondary: string,
    backgroundElement: string,
    backgroundSelected: string,
    /** A shade under the canvas, for sunken surfaces like text inputs. */
    backgroundInput: string,
    // The outline chrome wears: pills, the bottom bar, the header.
    border: string,
    // The colour a hard offset shadow is cast in: always a step *darker* than that scheme's own canvas.
    shadow: string,
    /** A rung up from `border`, for the raised cards that should read as nearer. */
    borderStrong: string,
    /** A rung down, for chips that should barely be there. */
    borderSubtle: string,
    /** The dashed outline of a slot waiting to be filled. */
    borderDashed: string,
    // The two tones an option you have *not* picked wears: its outline and its glyph.
    borderMuted: string,
    textFaint: string,
    // The board's own two surfaces: a tile nobody has typed into yet, and the outline around it.
    boardEmpty: string,
    boardEmptyBorder: string,
    // The fill of a letter the word does not contain.
    markAbsent: string,
    // Destructive as *text*, which is not the same red as destructive as a fill.
    destructiveText: string,
    // The colour the app answers a cursor with, and the halo around whatever holds it.
    focus: string,
    focusRing: string,
    /** The fill of the one slot being typed into, a step up from its neighbours. */
    backgroundFocus: string,
    /** Flat fill for the "off" half of a control, where nothing is happening yet. */
    muted: string,
    // The wash behind a modal, and the heavier one behind the auth sheet.
    scrim: string,
    scrimStrong: string,

    primary: string,
    secondary: string,
    lemon: string,
    mint: string,
    violet: string,
    blush: string,
    available: string,
    destructive: string,
    textOnAccent: string
}

// Deliberately not exported.
const Colors: Record<Scheme, Palette> = {
    light: {
        ...Brand,
        text: '#0F0D12',
        textSecondary: '#6C6A62',
        textMuted: '#8A8375',
        background: '#FBF7F0',
        // Plain white, not a tinted paper: the canvas carries the warmth, and a card has to lift off it.
        backgroundSecondary: '#FFFFFF',
        backgroundElement: '#F0F0F3',
        backgroundSelected: '#E0E1E6',
        backgroundInput: '#F7EBD8',
        border: '#0F0D12',
        shadow: Brand.ink,
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
        textSecondary: '#A9A5B6',
        textMuted: '#8C899B',
        // Charcoal rather than near-black, and the accents are the reason.
        background: '#1B1A22',
        // Surfaces still climb away from the canvas as they come forward, but they are no longer doing the separating alone.
        backgroundSecondary: '#26242F',
        backgroundElement: '#211F29',
        backgroundSelected: '#333140',
        backgroundInput: '#14131A',
        border: '#474554',
        shadow: '#08070D',
        borderStrong: '#57546A',
        borderSubtle: '#3A3846',
        borderDashed: '#474554',
        borderMuted: '#3A3846',
        textFaint: '#7E7B8C',
        boardEmpty: '#221F2A',
        boardEmptyBorder: '#3A3846',
        // A rung above `boardEmpty`, not below it.
        markAbsent: '#383544',
        destructiveText: '#FF7A6E',
        focus: Brand.lemon,
        focusRing: 'rgba(255, 229, 56, 0.25)',
        backgroundFocus: '#2E2C3A',
        muted: '#3A3644',
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

// Outfit ships as one static file per weight (there is no variable cut).
export const Fonts = {
    400: 'Outfit_400Regular',
    500: 'Outfit_500Medium',
    700: 'Outfit_700Bold',
    900: 'Outfit_900Black',
} as const;

export type FontWeight = keyof typeof Fonts;

const LoadedWeights = Object.keys(Fonts).map(Number) as FontWeight[];

// Resolve any React Native `fontWeight` to a loaded Outfit family, snapping to the nearest available weight (600 -> 700, 300 -> 400, ...).
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

// Build a hard shadow: `<offset>px <offset>px 0 0 <color>`.
export const hardShadow = (offset: number, color: string): ViewStyle => ({
    boxShadow: `${offset}px ${offset}px 0 0 ${color}`,
});

// How far each of `theme.shadows`' hard shadows throws, in px.
export const ShadowReach = {
    hard: 3,
    hardSmall: 2,
    hardLarge: 5
} as const;

export interface Shadows {
    hard: ViewStyle,
    hardSmall: ViewStyle,
    hardLarge: ViewStyle
}

// A three-stop gradient fill, lightest stop first, on the house 160° axis.
export function linearGradient(stops: readonly [string, string, string], midpoint: number = 55): ViewStyle {
    const gradient = `linear-gradient(160deg, ${stops[0]}, ${stops[1]} ${midpoint}%, ${stops[2]})`;

    return Platform.select<ViewStyle>({
        web: { backgroundImage: gradient } as ViewStyle,
        default: { experimental_backgroundImage: gradient } as ViewStyle
    })!;
}

/** The gradients the app's own icon tiles use, keyed by the accent they are built on. */
export const Gradients = {
    primary: ['#FF7A45', Brand.primary, '#E04407'],
    secondary: ['#6C7BFF', Brand.secondary, '#2634C4'],    
    lemon: ['#FFF07A', Brand.lemon, '#EFCE00'],
    mint: ['#A8F5D6', Brand.mint, '#35C99A'],
    violet: ['#DCD2FF', Brand.violet, '#9B85F5'],
    pink: ['#FFE0DD', Brand.pink, '#F28F86'],
} as const satisfies Record<string, readonly [string, string, string]>;

// Which of the two inks stays readable on top of an accent: paper for the saturated fills, ink for the pale ones.
export type AccentInk = 'ink' | 'paper';

// One colour identity, in the two forms a component might need it and with the answer to what may be written on top of it.
export interface Accent {
    /** The flat fill, for the small surfaces that would be wasted on a gradient. */
    color: string,
    /** The shaded form of the same colour, for anything big enough to shade. */
    gradient: readonly [string, string, string],
    ink: AccentInk
}

/** The one of the two inks an accent's own `AccentInk` is asking for. */
export function accentInkColor(ink: AccentInk): string {
    return ink === 'ink' ? Brand.ink : Brand.textOnAccent;
}

// A brand hex at partial strength, for the glows and the dimmed labels that are drawn from a colour a component was handed rather than from a token.
export function withAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '');
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return color;

    const value = parseInt(hex, 16);

    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

// Which fill a solid button wears.
export type ButtonVariant = 'primary' | 'secondary' | 'muted' | 'neutral';

export interface ButtonVariantStyle {
    fill: string,
    label: string
}

// One scheme's worth of the design system: its palette, plus everything derived from it.
export interface Theme {
    scheme: Scheme,
    colors: Palette,
    // How heavy an outline is: 2px in both schemes.
    borderWidth: number,
    shadows: Shadows,
    // The lift under something that should look like it is sitting above the page.
    popShadow: (accent: string) => ViewStyle,
    // The chrome shared by the app's solid buttons: hard border, hard shadow, accent fill.
    solidButton: ViewStyle,
    buttonVariants: Record<ButtonVariant, ButtonVariantStyle>,
    pageBackground: ViewStyle
}

// The canvas behind every page: graph paper, in whichever of the two inks the scheme has to draw with.
function pageCanvas(scheme: Scheme): { image: string, size: string, repeat: string } {
    // Paper at 5.5% against ink at 9%.
    const dot = scheme === 'dark'
        ? 'rgba(245, 243, 239, 0.055)'
        : 'rgba(15, 13, 18, 0.09)';

    return {
        image: `radial-gradient(${dot} 1px, transparent 1px)`,
        size: '22px 22px',
        repeat: 'repeat'
    };
}

function buildTheme(scheme: Scheme): Theme {
    const colors = Colors[scheme];
    const canvas = pageCanvas(scheme);
    const dark = scheme === 'dark';

    const borderWidth = 2;

    // Cast into `colors.shadow` rather than `colors.border`.
    const shadows: Shadows = {
        hard: hardShadow(ShadowReach.hard, colors.shadow),
        hardSmall: hardShadow(ShadowReach.hardSmall, colors.shadow),
        hardLarge: hardShadow(ShadowReach.hardLarge, colors.shadow)
    };

    const popShadow = (accent: string): ViewStyle => ({
        boxShadow: dark
            ? `3px 3px 0 0 ${accent}, 0 16px 28px -18px rgba(0, 0, 0, 0.7)`
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
            alignContent: 'center',
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

// Height of the floating bottom bar.
export const BottomBarHeight = 60;

// Height of the app header.
export const HeaderHeight = 66;

export const MaxContentWidth = 800;

// The width of the one column every page is drawn in.
export const ContentWidth = 600;
