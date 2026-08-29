import BackChip from "@/components/layout/BackChip";
import { useChromeless } from "@/components/layout/FullScreenContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AppText from "@/components/text/AppText";
import { accentOf, type Game } from "@/constants/games";
import { accentInkColor, withAlpha } from "@/constants/theme";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { Children, Fragment, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
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
     * One block per child, ruled off from one another.
     *
     * A rule between two rows rather than a card around each is the whole shape of this
     * screen: the settings are one object being described, not a stack of separate
     * things, and boxing each knob would say the opposite.
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
export default function SettingsPageBase({ game, title, back, eyebrow, children, facts, error, action }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    // Claimed here so a page built on this cannot forget. A page with an early return of
    // its own should claim it as well — see `useChromeless`.
    useChromeless();

    // The app's header used to hold the notch open. Nothing does now but this band.
    const insets = useSafeAreaInsets();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    // Nulls and falses drop out here, so a section the page decided not to render takes
    // its divider with it rather than leaving a rule against nothing.
    const sections = Children.toArray(children);

    return (
        <AccentProvider accent={accent}>
            <View style={styles.page}>
                <View
                    style={[
                        styles.header,
                        { backgroundColor: accent.color, paddingTop: insets.top + 14 }
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
                    {sections.map((section, index) => (
                        <Fragment key={index}>
                            {index > 0 && <View style={styles.divider} />}

                            <View style={styles.section}>{section}</View>
                        </Fragment>
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
    // One sheet from the top of the window to the bottom of it. On a desktop window it
    // is the app's column and the canvas shows either side; on a phone it is the screen.
    page: {
        flex: 1,
        width: '100%',
        backgroundColor: theme.colors.backgroundSecondary
    },
    header: {
        paddingHorizontal: 18,
        paddingBottom: 18,
        gap: 14,
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
        paddingVertical: 16
    },
    // Between sections only. The band and the footer draw the two ends.
    divider: {
        height: 2,
        backgroundColor: theme.scheme === 'dark' ? theme.colors.border : 'rgba(15, 13, 18, 0.12)'
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
