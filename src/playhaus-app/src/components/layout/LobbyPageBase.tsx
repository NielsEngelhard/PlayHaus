import { useContextPillStyles } from "@/components/layout/ContextPill";
import { useChromeless } from "@/components/layout/FullScreenContext";
import MusicToggle from "@/components/layout/MusicToggle";
import AppText from "@/components/text/AppText";
import JoinCodeBand from "@/components/ui/JoinCodeBand";
import { accentOf, type Game } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { getReach } from "@/utils/size-utils";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    game: Game,
    title: string,
    live: boolean,
    onBack: () => void,
    backLabel: string,
    code: string,
    handsOutCode?: boolean,
    children: ReactNode,
    footer: ReactNode
}

/** The design's row: tall enough to clear the notch, short enough to spend on chrome. */
const BAR_HEIGHT = 62;
const CHIP_SIZE = 36;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Opacity is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath. The dot fades out over this, then back in over it. */
const PULSE_MS = 1000;

export default function LobbyPageBase({
    game,
    title,
    live,
    onBack,
    backLabel,
    code,
    handsOutCode = false,
    children,
    footer
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    useChromeless();

    const insets = useSafeAreaInsets();

    const { width: windowWidth } = useWindowDimensions();
    const reach = getReach(windowWidth)

    return (
        <View style={styles.screen}>
            <View style={[styles.bar, { height: BAR_HEIGHT + insets.top, paddingTop: insets.top }]}>
                <Pressable
                    onPress={onBack}
                    accessibilityRole='button'
                    accessibilityLabel={backLabel}
                    style={styles.chip}
                >
                    <Feather name='arrow-left' size={17} color={theme.colors.text} />
                </Pressable>

                <AppText style={styles.title} numberOfLines={1}>{title}</AppText>

                <RoomPill code={code} live={live} />

                <MusicToggle />
            </View>

            <ScrollView
                style={[styles.scroll, { marginHorizontal: -reach }]}
                contentContainerStyle={{ paddingHorizontal: reach }}
                showsVerticalScrollIndicator={false}
            >
                {handsOutCode && (
                    <JoinCodeBand game={game} code={code} style={{
                        marginHorizontal: -reach,
                        paddingHorizontal: reach
                    }} />
                )}

                <View style={styles.content}>{children}</View>
            </ScrollView>

            <AccentProvider accent={accentOf(game)}>
                <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
                    {footer}
                </View>
            </AccentProvider>
        </View>
    )
}

/**
 * Which room this is, and whether it is still listening, in one pill at the right of the
 * bar.
 *
 * The two share a pill because neither earns one alone. The code is four characters, and a
 * frame around four characters next to a frame around one dot is two frames doing the work
 * of one. And the state used to spend a whole word — "Live" — saying the least surprising
 * thing a lobby you are sitting in could tell you; silent while it holds and loud only when
 * it breaks is the right budget for one bit, which is what the dot alone now does.
 *
 * So the dot is the status and the label is the address. A screen reader gets them as two
 * things in that order rather than as one sentence somebody had to compose out of two
 * catalogue entries, which is also why neither of the strings here had to change.
 */
function RoomPill({ code, live }: { code: string, live: boolean }) {
    const t = useT();
    const styles = useStyles();
    const pill = useContextPillStyles();

    return (
        <View style={[pill.pill, styles.roomPill]}>
            <PulseDot
                live={live}
                label={live ? t('lobby.live') : t('lobby.disconnected')}
            />

            <AppText
                style={[pill.label, styles.code]}
                numberOfLines={1}
                accessibilityLabel={t('lobby.codeSpoken', { characters: [...code].join(' ') })}
            >
                {code}
            </AppText>
        </View>
    )
}

/**
 * The dot in the pill: breathing while connected, flat and red once not.
 *
 * It carries the label as well, because it is now the whole of what the pill says about the
 * connection — the word that used to sit beside it is gone.
 */
function PulseDot({ live, label }: { live: boolean, label: string }) {
    const theme = useTheme();
    const pill = useContextPillStyles();

    const [pulse] = useState(() => new Animated.Value(1));

    useEffect(() => {
        // A dropped connection holds still. A dot that kept breathing in red would read
        // as "working on it" at exactly the moment nothing is working.
        if (!live) {
            pulse.setValue(1);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.3,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [live, pulse]);

    return (
        <Animated.View
            accessibilityRole='text'
            accessibilityLabel={label}
            style={[
                pill.dot,
                { backgroundColor: live ? theme.colors.available : theme.colors.destructive },
                { opacity: pulse }
            ]}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the viewport this page claimed, which is what lets the bar and the footer stay
    // put while the middle scrolls between them.
    screen: {
        flex: 1,
        width: '100%'
    },

    /**
     * Everything but the sides and the notch, which are set at the call site — see `reach`
     * and `insets`. The bar pulls out past the column's edges and lays its own padding
     * down inside, so the rule under it runs the full width of the window while the chip,
     * the title and the two controls stay in the column.
     */
    bar: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two + 2,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },

    chip: {
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    // The pill's own `flexShrink` is set for a game's name, which can be long. A code is
    // four characters and every one of them matters, so this one holds its width and lets
    // the title beside it give the ground instead.
    roomPill: {
        flexShrink: 0
    },
    // The pill's label, opened up — not to the 2 the guest's footer wears or the 6 the QR
    // panel does, because this is chrome. Far enough apart to stop reading as a word.
    code: {
        letterSpacing: 1.6
    },

    // Takes the room between the chip and the controls, which is also what pushes them to
    // the far edge without either side having to know the other's width.
    title: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    // Stretched rather than sized: the width has to come out of what the column leaves
    // *after* the negative margins set at the call site, which a `width: '100%'` would
    // pin back to the column and undo.
    scroll: {
        alignSelf: 'stretch'
    },
    // The page's gutters, which a chromeless page has to lay down for itself. Around the
    // children only: the band above them runs edge to edge and carries its own.
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: 18,
        gap: 18,
        // Clears the shadows the cards throw downwards, which paint outside their own box
        // and would otherwise be cropped by the scroller's bottom edge.
        paddingBottom: Spacing.three
    },
    // Outside the scroller, so it is on the bottom edge whatever the page above it does.
    // The bottom padding is set at the call site, from the device's own inset.
    footer: {
        flexShrink: 0,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.two
    }
}))
