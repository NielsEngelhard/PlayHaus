import AccentBand from "@/components/layout/AccentBand";
import BackChip from "@/components/layout/BackChip";
import { useChromeless } from "@/components/layout/FullScreenContext";
import { ScrollContainerProvider, useScrollContainer } from "@/components/layout/ScrollContainerContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AppText from "@/components/text/AppText";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { accentOf, type Game } from "@/constants/games";
import { accentInkColor, Spacing, withAlpha } from "@/constants/theme";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { Children, useEffect, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    /** Whose settings these are. Supplies the mark, the name and the colour. */
    game: Game,
    /** What this screen sets up, on the band — "Solo setup". */
    title: string,
    /** Where the way out goes. This page has the only one: there is no app header on it. */
    back: Href,
    // Takes the chip over, for a screen whose "back" is a step of its own rather than another page.
    onBack?: () => void,
    /** Stands in for the game's name in the band's top row, for a screen that is not about it. */
    eyebrow?: string,
    // Where this screen is in a run of them, as a track under the top row.
    progress?: { current: number, total: number },
    // A line about the screen, above the first setting.
    intro?: string,
    // What is being configured, live on the band.
    preview?: ReactNode,
    // The preview's one-line reading — "5 letters · hard mode" — under it in small caps.
    previewCaption?: string,
    // One block per child, each its own section of the column, ruled apart by hairlines.
    children: ReactNode,
    // Replays the sheet's entrance whenever it changes, for a screen that swaps its own contents underneath a band that stays put.
    enterKey?: string,
    enterFrom?: number,
    /** What the player is about to get, in a line above the action. */
    facts?: string,
    /** What went wrong, in the same place. Already translated. */
    error?: string,
    /** The one thing this screen is for. Usually a `StartGameButton`. */
    action: ReactNode
}

// The distance the band's contents and the column below it keep from the column's edges.
const HEADER_PADDING = 18;

// The page every game's setup screen *is*.
export default function SettingsPageBase({ game, title, back, onBack, eyebrow, progress, intro, preview, previewCaption, children, enterKey, enterFrom, facts, error, action }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    // Claimed here so a page built on this cannot forget.
    useChromeless();

    const insets = useSafeAreaInsets();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    // Published to the page, so a card deep in it can bring itself into view.
    const scroll = useScrollContainer();

    // Back to the top whenever the contents change underneath the scroller.
    const { scroller } = scroll;
    useEffect(() => {
        if (enterKey === undefined) return;

        scroller.current?.scrollTo({ y: 0, animated: false });
    }, [enterKey, scroller]);

    // Nulls and falses drop out here, so a section the page decided not to render takes
    const sections = Children.toArray(children);

    // Built out here so the scroller can hand it to `SlideFadeIn` or render it bare without the column being written twice.
    const column = (
        <>
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
        </>
    );

    return (
        <AccentProvider accent={accent}>
            <View style={styles.page}>
                <AccentBand gradient={game.gradient} gutter={0} underHeader={false} style={styles.header}>
                    {/* The chrome the app's header would have carried, on the page's own one. */}
                    <View style={styles.chrome}>
                        <BackChip href={back} onPress={onBack} variant='band' />

                        <View style={styles.chromeRight}>
                            <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.85) }]}>
                                {eyebrow ?? game.name}
                            </AppText>

                            <ThemeToggle variant='band' />
                        </View>
                    </View>

                    {/* Under the row that names the step, because it is the same sentence said as a picture. */}
                    {progress !== undefined && (
                        <View style={styles.track}>
                            {Array.from({ length: progress.total }, (_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.segment,
                                        { backgroundColor: withAlpha(ink, i < progress.current ? 0.9 : 0.22) }
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {preview !== undefined ? (
                        <>
                            <AppText style={[styles.title, { color: ink }]}>{title}</AppText>

                            {/* The stage. */}
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
                        // No preview: the band is a title bar after all, so the mark keeps the title company the way it always did.
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
                </AccentBand>

                <View style={styles.sheet}>
                    {/* The only thing on the page that moves. */}
                    <ScrollContainerProvider container={scroll}>
                        <ScrollView
                            {...scroll.viewport}
                            style={styles.body}
                            contentContainerStyle={styles.bodyContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View {...scroll.content}>
                                {enterKey === undefined ? column : (
                                    <SlideFadeIn
                                        replayKey={enterKey}
                                        offsetX={enterFrom}
                                        durationMs={260}
                                    >
                                        {column}
                                    </SlideFadeIn>
                                )}
                            </View>
                        </ScrollView>
                    </ScrollContainerProvider>
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
    header: {
        paddingTop: 14,
        paddingHorizontal: HEADER_PADDING,
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
    // Pulled up out of the band's own gap.
    track: {
        flexDirection: 'row',
        gap: 5,
        marginTop: -Spacing.two
    },
    segment: {
        flex: 1,
        height: 4,
        borderRadius: 999
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
        flex: 1
    },
    body: {
        flex: 1
    },
    // The sides belong to the page; the sections carry the vertical rhythm between the hairlines that rule them apart.
    bodyContent: {
        flexGrow: 1,
        paddingHorizontal: HEADER_PADDING,
        paddingTop: 4,
        paddingBottom: 16
    },
    section: {
        paddingVertical: Spacing.three
    },
    // A 1px rule, not the house 2px line: these are creases in the sheet, not fences between controls.
    sectionDivided: {
        borderTopWidth: 1,
        borderTopColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : withAlpha(theme.colors.border, 0.10)
    },
    // Not in a `Card`: a paragraph in a box reads as a notice about the page rather than as the page introducing itself.
    intro: {
        fontSize: 14,
        lineHeight: 14 * 1.5,
        color: theme.colors.textSecondary
    },
    // Outside the scroller, so it is on the bottom edge whatever the form above it does.
    footer: {
        paddingHorizontal: HEADER_PADDING,
        paddingTop: 14,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : withAlpha(theme.colors.border, 0.10)
    },
    // A line about the button under it.
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
