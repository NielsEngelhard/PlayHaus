import BackChip from "@/components/layout/BackChip";
import { useChromeless } from "@/components/layout/FullScreenContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AppText from "@/components/text/AppText";
import AccentFact, { ON_ACCENT } from "@/components/ui/AccentFact";
import { accentOf, type Game } from "@/constants/games";
import { linearGradient, Spacing } from "@/constants/theme";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { getReach } from "@/utils/size-utils";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ModeFact {
    icon: keyof typeof Feather.glyphMap,
    /** Already translated, like every other string on this page. */
    text: string
}

interface Props {
    /** Whose modes these are. Supplies the mark, the gradient and the ink on it. */
    game: Game,
    /** The mode being picked *within* — "Solo", "Multiplayer". */
    title: string,
    /** The pitch under it, in a line or two. */
    description: string,
    /**
     * The outlined pills under the pitch: what this mode costs you in players, phones and
     * minutes, or what it has given you so far.
     */
    facts: ModeFact[],
    /** Where the way out goes. This page has the only one: there is no app header on it. */
    back: Href,
    /** Stands in for the game's name in the band's top row, for a screen not about it. */
    eyebrow?: string,
    /**
     * The ways to play, as one column on the sheet.
     *
     * Each child brings its own chrome — these are cards of two or three different shapes
     * rather than rows in a form, so unlike `SettingsPageBase` nothing is ruled apart or
     * padded for them here.
     */
    children: ReactNode
}

/** The sheet's side padding, and so also the band's once the fill has reached past it. */
const PAGE_PADDING = 24;

/**
 * How far the sheet climbs back up over the band.
 *
 * The band's own bottom padding is `SHEET_LIFT + BAND_TAIL`, so what shows of it below the
 * facts is `BAND_TAIL` and the first card straddles the edge rather than beginning at it.
 * Same idea as `GameIndexPage`'s `OVERLAP_FRACTION` and `SettingsPageBase`'s `BAND_TUCK`,
 * with the depth simply read off the design: nothing here has to be measured, because the
 * first card on this page is always the big one.
 */
const SHEET_LIFT = 100;
const BAND_TAIL = 14;

const MARK_SIZE = 58;

/**
 * The page a game's ways to play are picked on: the game's gradient across the top
 * carrying the mode's name, and a sheet of choices pulled up over it.
 *
 * The third of the app's page bases, and the one that sits between the other two — you
 * arrive from the game's index and leave for a `SettingsPageBase` or a `LobbyPageBase`.
 * It exists because "solo" and "multiplayer" stopped being single destinations: each is a
 * shelf of modes now, and a shelf needs a page rather than a menu hung off a card.
 *
 * Like `SettingsPageBase` it takes the viewport and the app's chrome with it (see
 * `useChromeless`), because the band at the top is a header and a screen with two of those
 * is a screen where neither is the header. What the app's one gave up comes back on the
 * band: the way out, and the theme switch.
 *
 * Unlike `SettingsPageBase` there is no footer and nothing that has to stay on the bottom
 * edge — every choice on the page is equally the point of it — so the whole thing, band
 * included, scrolls as one. That scroller has to be this page's own: `useChromeless` also
 * claims full-screen, which is what turns the root layout's scroller off.
 *
 * The game's colour arrives once and is lent down through `AccentProvider`, so the back
 * pill and the theme toggle come out in the right ink without being told.
 */
export default function GameModePageBase({ game, title, description, facts, back, eyebrow, children }: Props) {
    const styles = useStyles();

    // Claimed here so a page built on this cannot forget. A page with an early return of
    // its own should claim it as well — see `useChromeless`.
    useChromeless();

    // The app's header used to hold the notch open. Nothing does now but this band.
    const insets = useSafeAreaInsets();

    /*
     * How far past the column's edges the band has to reach to make the window.
     *
     * The page is drawn in the app's one 600dp column, which on a phone is the window and
     * on a desktop window is a strip down the middle of it. A header that stops where the
     * column does is a coloured rectangle laid on the page rather than the top of it, so
     * the fill reaches out and the padding below puts its contents back where they were.
     *
     * Web only, and the same trade `SettingsPageBase` and `GameIndexPage` make: a child
     * painting outside its parent is allowed on iOS and clipped on Android, and what keeps
     * the overflow from becoming sideways scroll is the `overflow-x: hidden` a vertical
     * `ScrollView` only has on web. `useWindowDimensions` answers 0 with no DOM to measure,
     * so the pre-rendered export ships the unbled band and hydration widens it.
     *
     * Unlike on `SettingsPageBase`, the reach is spent on the *page* rather than on the
     * band — and it has to be. There the band is a sibling of the scroller, so the only
     * thing that ever clips it is the root layout's full-window one. Here everything
     * scrolls together, and a vertical `ScrollView` on web is `overflow-x: hidden`: a band
     * reaching out from inside this one would be cut back to the column's 600dp exactly
     * where it is supposed to be widest. So the whole scroller is widened instead, and the
     * sheet below pads its cards back into the column.
     */
    const { width: windowWidth } = useWindowDimensions();
    const reach = getReach(windowWidth);

    /** The column's own gutter, once whatever the page reached out by is added back. */
    const gutter = reach + PAGE_PADDING;

    const accent = accentOf(game);
    const on = ON_ACCENT[accent.ink];

    return (
        <AccentProvider accent={accent}>
            {/* The page, and the scroller in it, reach out past the app's column so the
                band inside can be the full width of the window — see `reach`. */}
            <View style={[styles.page, { marginHorizontal: -reach }]}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={[
                            styles.band,
                            // Square once it runs off the sides of the window: a corner
                            // rounded against an edge it never touches reads as a mistake.
                            reach > Spacing.six && styles.bandWide,
                            {
                                paddingTop: insets.top + 14,
                                paddingHorizontal: gutter
                            },
                            linearGradient(game.gradient)
                        ]}
                    >
                        {/* The chrome the app's header would have carried, on the page's
                            own one. Both draw themselves as washes of ink over the accent
                            — see their `band` variants — so the game's name can sit
                            between them as part of the same row. */}
                        <View style={styles.chrome}>
                            <BackChip href={back} variant='band' />

                            <View style={styles.chromeRight}>
                                <AppText style={[styles.eyebrow, { color: on.muted }]}>
                                    {eyebrow ?? game.name}
                                </AppText>

                                <ThemeToggle variant='band' />
                            </View>
                        </View>

                        <Image
                            source={game.icon}
                            style={styles.mark}
                            accessibilityRole='image'
                            accessibilityLabel={game.name}
                        />

                        <AppText style={[styles.title, { color: on.text }]}>{title}</AppText>

                        <AppText style={[styles.description, { color: on.muted }]}>
                            {description}
                        </AppText>

                        <View style={styles.facts}>
                            {facts.map(fact => (
                                <AccentFact
                                    key={fact.text}
                                    icon={fact.icon}
                                    text={fact.text}
                                    on={on}
                                />
                            ))}
                        </View>
                    </View>

                    {/* The sheet. No surface of its own: the page's canvas is already
                        behind it, and the cards are what the eye reads as laid over the
                        band.

                        Its padding is what puts the cards back in the app's column after
                        the page reached out of it — so they stay 600dp wide under a band
                        that is now as wide as the window. */}
                    <View
                        style={[
                            styles.sheet,
                            {
                                paddingHorizontal: gutter,
                                paddingBottom: insets.bottom + PAGE_PADDING
                            }
                        ]}
                    >
                        {children}
                    </View>
                </ScrollView>
            </View>
        </AccentProvider>
    )
}

const useStyles = createThemedStyles(theme => ({
    // No `width`, on either of these. Both are stretched to their parent by default, which
    // is what lets the negative margin set at the call site *widen* the page rather than
    // slide a fixed-width one sideways out of the column.
    page: {
        flex: 1
    },
    scroll: {
        flex: 1
    },
    // `flexGrow` rather than `flex`, so a short page sits under the band instead of being
    // stretched down to fill a desktop window.
    scrollContent: {
        flexGrow: 1
    },

    band: {
        // What the sheet climbs back over, plus the sliver left showing under the facts.
        paddingBottom: SHEET_LIFT + BAND_TAIL,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Light cuts the band off with the same hard line every card wears. Dark leaves it
        // open: a mid-grey line under a full-width gradient reads as a seam rather than an
        // edge, and the gradient is its own edge anyway.
        borderBottomWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    bandWide: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0
    },

    chrome: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    chromeRight: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },
    eyebrow: {
        flexShrink: 1,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },

    mark: {
        marginTop: 14,
        width: MARK_SIZE,
        height: MARK_SIZE,
        flexShrink: 0,
        // The SVGs draw their own ground, border and glyph; this only rounds the corner
        // off to the same radius they are cut with.
        borderRadius: 15
    },

    title: {
        marginTop: 14,
        fontSize: 42,
        fontWeight: 900,
        lineHeight: 42 * 1.02,
        letterSpacing: -2
    },

    description: {
        marginTop: 12,
        // Short of the full width even where there is room, where a pitch running the
        // whole 600 would read as a paragraph rather than as a line under a name.
        maxWidth: 300,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 14 * 1.5
    },

    facts: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7
    },

    // `paddingHorizontal` is set at the call site, from the reach — see `gutter`.
    sheet: {
        marginTop: -SHEET_LIFT,
        gap: 12
    }
}))
