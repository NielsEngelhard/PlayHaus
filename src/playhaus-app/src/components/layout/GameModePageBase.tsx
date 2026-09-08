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
    // The outlined pills under the pitch.
    facts: ModeFact[],
    /** Where the way out goes. This page has the only one: there is no app header on it. */
    back: Href,
    /** Stands in for the game's name in the band's top row, for a screen not about it. */
    eyebrow?: string,
    // The ways to play, as one column on the sheet.
    children: ReactNode
}

/** The sheet's side padding, and so also the band's once the fill has reached past it. */
const PAGE_PADDING = 24;

// How far the sheet climbs back up over the band.
const SHEET_LIFT = 100;
const BAND_TAIL = 14;

const MARK_SIZE = 58;

// The page a game's ways to play are picked on.
export default function GameModePageBase({ game, title, description, facts, back, eyebrow, children }: Props) {
    const styles = useStyles();

    // Claimed here so a page built on this cannot forget.
    useChromeless();

    // The app's header used to hold the notch open. Nothing does now but this band.
    const insets = useSafeAreaInsets();

    // How far past the column's edges the band has to reach to make the window.
    const { width: windowWidth } = useWindowDimensions();
    const reach = getReach(windowWidth);

    /** The column's own gutter, once whatever the page reached out by is added back. */
    const gutter = reach + PAGE_PADDING;

    const accent = accentOf(game);
    const on = ON_ACCENT[accent.ink];

    return (
        <AccentProvider accent={accent}>
            {/* The page, and the scroller in it, reach out past the app's column so the band inside can be the full width of the window. */}
            <View style={[styles.page, { marginHorizontal: -reach }]}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={[
                            styles.band,
                            // Square once it runs off the sides of the window: a corner rounded against an edge it never touches reads as a mistake.
                            reach > Spacing.six && styles.bandWide,
                            {
                                paddingTop: insets.top + 14,
                                paddingHorizontal: gutter
                            },
                            linearGradient(game.gradient)
                        ]}
                    >
                        {/* The chrome the app's header would have carried, on the page's own one. */}
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

                    {/* The sheet. */}
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
    // No `width`, on either of these.
    page: {
        flex: 1
    },
    scroll: {
        flex: 1
    },
    // `flexGrow` rather than `flex`, so a short page sits under the band instead of being stretched down to fill a desktop window.
    scrollContent: {
        flexGrow: 1
    },

    band: {
        // What the sheet climbs back over, plus the sliver left showing under the facts.
        paddingBottom: SHEET_LIFT + BAND_TAIL,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Light cuts the band off with the same hard line every card wears.
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
        // The SVGs draw their own ground, border and glyph.
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
        // Short of the full width even where there is room, where a pitch running the whole 600 would read as a paragraph rather than as a line under a name.
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
