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
    /** What this screen sets up, on the band — "Solo setup". */
    title: string,
    /** Where the way out goes. This page has the only one: there is no app header on it. */
    back: Href,
    /** Stands in for the game's name in the band's top row, for a screen that is not about it. */
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
     * What is being configured, live on the band: a strip of letter tiles that grows
     * with the word length, a row of seats that fills as names are typed. The band is
     * the game's colour and this is what makes it the game's *stage* rather than its
     * title bar — the controls below have a visible consequence above them.
     *
     * Optional on purpose: a page with nothing worth staging leaves it out and the band
     * falls back to the mark-and-title lockup it always had.
     */
    preview?: ReactNode,
    /**
     * The preview's one-line reading — "5 letters · hard mode" — under it in small
     * caps. Arrives already translated, like every other string on this page.
     */
    previewCaption?: string,
    /**
     * One block per child, each its own section of the column, ruled apart by
     * hairlines.
     *
     * The sections are bare: label-over-control or a flush row, straight on the page's
     * canvas. A child that draws a panel of its own — an `InlineNotification`, a shelf —
     * still comes as one child, and simply brings its chrome with it.
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
 * The band's own side padding — the distance its contents keep from the column's edges
 * once the fill has reached out past them (see `bleed`).
 */
const HEADER_PADDING = 18;

/**
 * How far the sheet climbs back up over the band. What shows of the band below the
 * preview is `BAND_TUCK` less than the band's own bottom padding, and the sheet's
 * rounded corners are cut into accent rather than into canvas — which is the whole
 * trick: the form reads as a sheet of paper laid over the game's colour.
 */
const BAND_TUCK = 18;

/**
 * The page every game's setup screen *is*: the game's own band across the top, a sheet
 * of settings pulled up over it, and the action that starts it on the bottom edge.
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
 * switches and the start button in `children` come out in the right colour without the
 * page passing it to each of them. The rows themselves stay ordinary components — the
 * same `ToggleRow` used outside a settings page looks exactly as it did.
 */
export default function SettingsPageBase({ game, title, back, eyebrow, intro, preview, previewCaption, children, facts, error, action }: Props) {
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
                            paddingHorizontal: reach + HEADER_PADDING
                        }
                    ]}
                >
                    {/* The chrome the app's header would have carried, on the page's own
                        one. Both draw themselves as washes of ink over the accent — see
                        their `band` variants — so the game's name can sit between them
                        as part of the same row. */}
                    <View style={styles.chrome}>
                        <BackChip href={back} variant='band' />

                        <View style={styles.chromeRight}>
                            <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.85) }]}>
                                {eyebrow ?? game.name}
                            </AppText>

                            <ThemeToggle variant='band' />
                        </View>
                    </View>

                    {preview !== undefined ? (
                        <>
                            <AppText style={[styles.title, { color: ink }]}>{title}</AppText>

                            {/* The stage. Centred because the object on it is the point
                                of the band, where the title reads left like a heading. */}
                            <View style={styles.stage}>
                                {preview}

                                {previewCaption !== undefined && (
                                    <AppText style={[styles.caption, { color: withAlpha(ink, 0.9) }]}>
                                        {previewCaption}
                                    </AppText>
                                )}
                            </View>
                        </>
                    ) : (
                        // No preview: the band is a title bar after all, so the mark
                        // keeps the title company the way it always did.
                        <View style={styles.lockup}>
                            <Image
                                source={game.icon}
                                style={styles.mark}
                                accessibilityRole='image'
                                accessibilityLabel={game.name}
                            />

                            <AppText style={[styles.title, styles.lockupTitle, { color: ink }]}>
                                {title}
                            </AppText>
                        </View>
                    )}
                </View>

                {/* The sheet: the page's own canvas pulled up over the band, corners
                    rounded into the accent. `overflow: 'hidden'` clips inward, which
                    Android is fine with — it is what cuts the scrolling form to the
                    corners. The grabber above the scroller is set dressing: nothing
                    drags, it just says "this is a sheet" the way every sheet does. */}
                <View style={styles.sheet}>
                    <View style={styles.grabber} />

                    {/* The only thing on the page that moves. `flexGrow` on the contents
                        rather than `flex`, so a short form sits under the band instead
                        of being stretched down to meet the footer. */}
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
                            <View key={i} style={[styles.section, i > 0 && styles.sectionDivided]}>
                                {section}
                            </View>
                        ))}
                    </ScrollView>
                </View>

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
    // No bottom border: the sheet's own top edge is what draws the line now, and the
    // extra bottom padding is what the sheet climbs back over — see `BAND_TUCK`.
    header: {
        paddingBottom: BAND_TUCK + 12,
        gap: Spacing.three
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
    title: {
        fontSize: 32,
        fontWeight: 900,
        lineHeight: 32 * 1.05,
        letterSpacing: -1.2
    },
    stage: {
        alignItems: 'center',
        gap: 14,
        marginTop: -Spacing.half
    },
    caption: {
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        textAlign: 'center'
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
    lockupTitle: {
        flex: 1,
        minWidth: 0
    },
    sheet: {
        flex: 1,
        marginTop: -BAND_TUCK,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        overflow: 'hidden',
        ...theme.pageBackground
    },
    grabber: {
        alignSelf: 'center',
        marginTop: 10,
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.scheme === 'dark'
            ? withAlpha(theme.colors.text, 0.15)
            : withAlpha(theme.colors.border, 0.15)
    },
    body: {
        flex: 1
    },
    // The sides belong to the page; the sections carry the vertical rhythm between the
    // hairlines that rule them apart.
    bodyContent: {
        flexGrow: 1,
        paddingHorizontal: HEADER_PADDING,
        paddingTop: 4,
        paddingBottom: 16
    },
    section: {
        paddingVertical: Spacing.three
    },
    // A 1px rule, not the house 2px line: these are creases in the sheet, not fences
    // between controls. Dark's `borderSubtle` is the same one-rung-down idea.
    sectionDivided: {
        borderTopWidth: 1,
        borderTopColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : withAlpha(theme.colors.border, 0.10)
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
        paddingHorizontal: HEADER_PADDING,
        paddingTop: 14,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : withAlpha(theme.colors.border, 0.10)
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
