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
    pink: '#FFBEB8',
    /**
     * Pale enough that it is the one accent in the set that cannot carry paper text.
     * Anything filled with it wears ink instead — see `AccentInk`.
     */
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
    /**
     * A neutral the game accents never touch, for the one card in One of Us that has to
     * say nothing rather than something — see `revealFaceOf` in `features/one-of-us/roles`.
     */
    fog: '#DCDCE4'
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
     * One idea in both schemes: a hard line, with a hard shadow thrown off it. Light
     * draws that line in ink on paper and casts in the same ink. Dark draws it in a mid
     * grey on charcoal and casts into `shadow` — which only works because the dark
     * canvas sits high enough off black to have something darker beneath it.
     */
    border: string,
    /**
     * The colour a hard offset shadow is cast in: always a step *darker* than that
     * scheme's own canvas.
     *
     * Its own token rather than a reuse of `border`, because the two only coincide in
     * light — where the line and the shadow are both ink. Dark needs a line that reads
     * *up* off the canvas and a shadow that reads *down* into it, which is two
     * directions and therefore two values.
     */
    shadow: string,
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
    violet: string,
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
        // Charcoal rather than near-black, and the accents are the reason: a saturated
        // hue needs a ground to sit on, and #3B4DF0 on #0E0E13 had nothing under it and
        // read as a hole. Lifting the canvas also buys back the two things the old
        // scheme had to do without — a border you can see, and something darker than the
        // page to cast a shadow into.
        background: '#1B1A22',
        // Surfaces still climb away from the canvas as they come forward, but they are
        // no longer doing the separating alone: the border and the shadow carry it now,
        // the same way they do on paper.
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
        // A rung above `boardEmpty`, not below it: a tile the word has no use for has
        // still been filled in, and must not read as one nobody has typed into.
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
 * the current scheme's `shadow` and this file has no way to know which that is. Pass
 * `theme.colors.shadow`, or reach for `theme.shadows` where a standard offset will do.
 */
export const hardShadow = (offset: number, color: string): ViewStyle => ({
    boxShadow: `${offset}px ${offset}px 0 0 ${color}`,
});

/**
 * How far each of `theme.shadows`' hard shadows throws, in px. Anything that carries one
 * of these and sits inside an unpadded scroll container needs this much spare room on
 * its right (and, since the offset is diagonal, technically its bottom too) or the
 * offset corner gets clipped by the container instead of cast past it. See
 * `PlayerScoreRow`'s `row` style for the shape of that fix.
 */
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
    primary: ['#FF7A45', Brand.primary, '#E04407'],
    secondary: ['#6C7BFF', Brand.secondary, '#2634C4'],    
    lemon: ['#FFF07A', Brand.lemon, '#EFCE00'],
    mint: ['#A8F5D6', Brand.mint, '#35C99A'],
    violet: ['#DCD2FF', Brand.violet, '#9B85F5'],
    pink: ['#FFE0DD', Brand.pink, '#F28F86'],
} as const satisfies Record<string, readonly [string, string, string]>;

/**
 * Which of the two inks stays readable on top of an accent: paper for the saturated
 * fills, ink for the pale ones.
 *
 * A property of the fill rather than of the scheme — a gradient is the same gradient at
 * midnight, so this does not flip with the canvas the way `Palette` does.
 */
export type AccentInk = 'ink' | 'paper';

/**
 * One colour identity, in the two forms a component might need it and with the answer
 * to what may be written on top of it.
 *
 * The shape a `Game` from `constants/games.ts` already has — see `accentOf` there — so a
 * control that takes one of these can be handed a game and wear its colour. What that is
 * for is the settings card: the same word-length picker is lemon under League of Letters
 * and violet under One of Us, and neither the picker nor the page it sits on has to know
 * which. See `features/theme/AccentContext`.
 */
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

/**
 * A brand hex at partial strength, for the glows and the dimmed labels that are drawn
 * from a colour a component was handed rather than from a token.
 *
 * Only `#RRGGBB` is understood, which is every accent in this file. Anything else comes
 * back untouched — a shadow at full strength is a worse look, not a crash.
 */
export function withAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '');
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return color;

    const value = parseInt(hex, 16);

    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
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
    /**
     * How heavy an outline is: 2px in both schemes. Dark used to draw 1.5, because a
     * full-weight line in a low grey read as a smudge — but on the lifted canvas the
     * border is a real line again, and it is carrying the frame.
     */
    borderWidth: number,
    shadows: Shadows,
    /**
     * The lift under something that should look like it is sitting above the page.
     *
     * Light stacks a hard ink offset with a soft ambient one, so a card is both cut out
     * and floating. Dark keeps both layers but throws the hard one in `accent` rather
     * than in ink — the coloured offset is this scheme's signature. The ambient wash
     * under it is what stops a card floating on nothing when the accent it was handed
     * is a neutral.
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
 * The canvas behind every page: graph paper, in whichever of the two inks the scheme
 * has to draw with.
 *
 * One faint dot, tiled every 22px, in both schemes. Dark used to be a different idea
 * entirely — two washes of brand colour bled into opposite corners, because a dot grid
 * on near-black would have read as dust. The lifted canvas has room for the dot, so the
 * two schemes can be one page rather than two designs, and the brand hues go back to
 * being what the app puts *on* the page rather than part of the page itself.
 *
 * The tiling is why this returns three properties rather than one. React Native 0.86
 * carries `experimental_backgroundSize` / `_backgroundRepeat` alongside
 * `experimental_backgroundImage`, so the same pattern works on device and on web with
 * nothing but a prefix between them.
 */
function pageCanvas(scheme: Scheme): { image: string, size: string, repeat: string } {
    // Paper at 5.5% against ink at 9%: a light dot on a dark ground carries further than
    // a dark one on paper, so it needs less of itself to read as the same dot.
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

    // Cast into `colors.shadow` rather than `colors.border`. The two are the same ink in
    // light, but in dark the border has to read *up* off the canvas and the shadow *down*
    // into it, which is what lets both schemes use the one hard offset.
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

/**
 * Height of the floating bottom bar. It overlays the page rather than shrinking it,
 * so any scrollable content has to pad past this to stay reachable.
 */
export const BottomBarHeight = 60;

/**
 * Height of the app header.
 *
 * Exported because one screen has to know it: the pubquizR hand-off paints over the
 * header, and it can only line the two up by pulling back exactly this far. `Header`
 * itself reads it from here, so the two cannot drift apart.
 */
export const HeaderHeight = 66;

export const MaxContentWidth = 800;

/**
 * The width of the one column every page is drawn in.
 *
 * The root layout centres it and the app never goes wider, so on a desktop window the
 * whole app is this column with canvas either side. Exported because a page that wants
 * to reach past it has to know how far past it is — see the band in `GameIndexPage`.
 */
export const ContentWidth = 600;
