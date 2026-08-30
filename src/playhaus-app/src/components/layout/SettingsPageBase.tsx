import BackChip from "@/components/layout/BackChip";
import { useChromeless } from "@/components/layout/FullScreenContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AppText from "@/components/text/AppText";
import { accentOf, type Game } from "@/constants/games";
import { accentInkColor, Spacing, withAlpha } from "@/constants/theme";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { getReach } from "@/utils/size-utils";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { Children, type ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    /** Whose settings these are. Supplies the mark, the name and the colour. */
    game: Game,
    /** What this screen sets up, under the game's name — "Solo setup". */
    title: string,
    /** Where the way out goes. This page has the only one: there is no app header on it. */
    back: Href,
    /** Stands in for the game's name above the title, for a screen that is not about it. */
    eyebrow?: string,
    /**
     * A line about the screen, above the first setting.
     *
     * For a mode that has to explain itself before it asks anything. The band's title is
     * a name rather than a sentence, and the paragraph these screens used to open with
     * sat under a hero the band has since replaced.
     */
    intro?: string,
    /**
     * One block per child, each its own section of the column.
     *
     * A block that draws no chrome of its own arrives wrapped in a `Card`; one that is
     * already a panel — an `InlineNotification`, a shelf — comes bare, because a card
     * inside a card is two boxes saying the same thing.
     */
    children: ReactNode,
    /** What the player is about to get, in a line above the action. */
    facts?: string,
    /** What went wrong, in the same place. Already translated. */
    error?: string,
    /** The one thing this screen is for. Usually a `StartGameButton`. */
    action: ReactNode
}

/**
 * The band's own side padding, and so also the distance its contents keep from the
 * column's edges once the fill has reached out past them — see `bleed`.
 */
const HEADER_PADDING = 18;

/**
 * The page every game's setup screen *is*: the game's own header, a ruled column of
 * whatever that game has to ask, and the action that starts it.
 *
 * Not a card on a page — the page. It takes the viewport and the app's chrome with it
 * (see `useChromeless`), because the band at the top is a header and a screen with two
 * of those is a screen where neither is the header. What the app's one gave up comes
 * back on the band: the way out, and the theme switch.
 *
 * The three parts are fixed, free and fixed. The band and the footer are laid out
 * either side of a scroller, so the thing this screen is for is on the bottom edge from
 * the first frame and stays there — a form long enough to scroll scrolls *between* them
 * rather than carrying its own button off the bottom of the window.
 *
 * Everything specific to a game arrives as props or as children, and the game's colour
 * arrives once: this lends it to the controls inside through `AccentProvider`, so the
 * pickers and switches in `children` come out in the right colour without the page
 * passing it to each of them. The rows themselves stay ordinary components — the same
 * `ToggleRow` used outside a settings page looks exactly as it did.
 */
export default function SettingsPageBase({ game, title, back, eyebrow, intro, children, facts, error, action }: Props) {
    const styles = useStyles();
    const theme = useTheme();

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
     * the fill reaches out and the padding below puts its contents back where they were —
     * the chips and the title stay lined up with the rows underneath.
     *
     * Web only, and the same trade `GameIndexPage`'s hero band makes: a child painting
     * outside its parent is allowed on iOS and clipped on Android, and what keeps the
     * overflow from becoming sideways scroll is the `overflow-x: hidden` a vertical
     * `ScrollView` only has on web. `useWindowDimensions` answers 0 with no DOM to
     * measure, so the pre-rendered export ships the unbled band and hydration widens it.
     */
    const { width: windowWidth } = useWindowDimensions();
    const reach = getReach(windowWidth)

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    // Nulls and falses drop out here, so a section the page decided not to render takes
    const sections = Children.toArray(children);

    return (
        <AccentProvider accent={accent}>
            <View style={styles.page}>
                <View
                    style={[
                        styles.header,
                        {
                            backgroundColor: accent.color,
                            paddingTop: insets.top + 14,
                            marginHorizontal: -reach,
                            paddingHorizontal: reach
                        }
                    ]}
                >
                    {/* The chrome the app's header would have carried, on the page's own
                        one. Both chips draw their own paper fill and ink outline, so they
                        stand on an accent without being told they are. */}
                    <View style={styles.chrome}>
                        <BackChip href={back} />

                        <ThemeToggle />
                    </View>

                    <View style={styles.lockup}>
                        <Image
                            source={game.icon}
                            style={styles.mark}
                            accessibilityRole='image'
                            accessibilityLabel={game.name}
                        />

                        <View style={styles.headerText}>
                            <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.8) }]}>
                                {eyebrow ?? game.name}
                            </AppText>

                            <AppText style={[styles.title, { color: ink }]}>{title}</AppText>
                        </View>
                    </View>
                </View>

                {/* The only thing on the page that moves. `flexGrow` on the contents
                    rather than `flex`, so a short form sits under the band instead of
                    being stretched down to meet the footer. */}
                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    showsVerticalScrollIndicator={false}
                >
                    {intro !== undefined && (
                        <View style={styles.section}>
                            <AppText style={styles.intro}>{intro}</AppText>
                        </View>
                    )}

                    {sections.map((section, i) => (
                        <View key={i} style={styles.section}>{section}</View>
                    ))}
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    {error !== undefined && (
                        <View style={styles.note}>
                            <Feather name='alert-triangle' size={14} color={theme.colors.destructiveText} />

                            <AppText style={[styles.noteText, styles.errorText]}>{error}</AppText>
                        </View>
                    )}

                    {facts !== undefined && (
                        <View style={styles.note}>
                            <Feather name='info' size={14} color={theme.colors.textMuted} />

                            <AppText style={styles.noteText}>{facts}</AppText>
                        </View>
                    )}

                    {action}
                </View>
            </View>
        </AccentProvider>
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        flex: 1,
        width: '100%'
    },
    header: {
        paddingBottom: 18,
        gap: Spacing.two,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    chrome: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    lockup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14
    },
    mark: {
        width: 62,
        height: 62,
        flexShrink: 0
    },
    headerText: {
        flex: 1,
        minWidth: 0
    },
    eyebrow: {
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    title: {
        marginTop: 2,
        fontSize: 27,
        fontWeight: 900,
        lineHeight: 27 * 1.05,
        letterSpacing: -1
    },
    body: {
        flex: 1
    },
    // The sides belong to the page; the sections carry the vertical rhythm, and the
    // first one's own top padding is most of what the design has under the band.
    bodyContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 16
    },
    section: {
        paddingVertical: Spacing.two
    },
    // Not in a `Card`: a paragraph in a box reads as a notice about the page rather than
    // as the page introducing itself.
    intro: {
        fontSize: 14,
        lineHeight: 14 * 1.5,
        color: theme.colors.textSecondary
    },
    // Outside the scroller, so it is on the bottom edge whatever the form above it does.
    // The bottom padding is set at the call site, from the device's own inset.
    footer: {
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 9,
        borderTopWidth: 2,
        borderTopColor: theme.scheme === 'dark' ? theme.colors.border : 'rgba(15, 13, 18, 0.12)'
    },
    // A line about the button under it — centred on it rather than ranged left, because
    // it belongs to the button and not to the column above.
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    noteText: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    errorText: {
        color: theme.colors.destructiveText
    }
}))
