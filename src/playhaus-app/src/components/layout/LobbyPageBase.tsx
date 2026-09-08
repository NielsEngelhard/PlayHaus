import { useChromeless } from "@/components/layout/FullScreenContext";
import MusicToggle from "@/components/layout/MusicToggle";
import AppText from "@/components/text/AppText";
import JoinCodeHero from "@/components/ui/JoinCodeHero";
import { accentOf, type Game } from "@/constants/games";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
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

/** The game's colour as a ribbon along the top — the one place the page says whose it is. */
const STRIP_HEIGHT = 8;

const CHIP_SIZE = 34;

// Where the page stops being a phone screen and becomes a card on the canvas.
const FRAME_AT = 700;

/** The card, at its widest. A touch over the mockup's 390, since desktop rows run longer. */
const CARD_WIDTH = 460;

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath. The dot fades out over this, then back in over it. */
const PULSE_MS = 1000;

// The shape every lobby shares: the game's ribbon, a quiet bar, the code as a headline when there is one to hand out, a scrolling middle.
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

    // Static prerender sees a width of zero and renders the phone branch.
    const { width: windowWidth } = useWindowDimensions();
    const framed = Platform.OS === 'web' && windowWidth >= FRAME_AT;

    const accent = accentOf(game);

    return (
        <View style={[styles.screen, framed && styles.screenFramed]}>
            <View style={[styles.shell, framed && [styles.card, theme.popShadow(accent.color)]]}>
                {/* On a phone the ribbon absorbs the notch. */}
                <View style={{
                    height: STRIP_HEIGHT + (framed ? 0 : insets.top),
                    backgroundColor: accent.color
                }} />

                <View style={styles.gameKicker}>
                    <Image source={game.icon} style={styles.gameIcon} />

                    <AppText
                        style={[styles.gameName, { color: game.gradient[2] }]}
                        numberOfLines={1}
                    >
                        {game.name}
                    </AppText>
                </View>

                <View style={styles.bar}>
                    <Pressable
                        onPress={onBack}
                        accessibilityRole='button'
                        accessibilityLabel={backLabel}
                        style={styles.chip}
                    >
                        <Feather name='arrow-left' size={17} color={theme.colors.text} />
                    </Pressable>

                    <AppText style={styles.title} numberOfLines={1}>{title}</AppText>

                    <LivePill live={live} />

                    <MusicToggle variant='subtle' />
                </View>

                <ScrollView
                    style={[styles.scroll, framed && styles.scrollFramed]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        {handsOutCode && <JoinCodeHero game={game} code={code} />}

                        {children}
                    </View>
                </ScrollView>

                <AccentProvider accent={accent}>
                    <View style={[
                        styles.footer,
                        { paddingBottom: framed ? Spacing.three : insets.bottom + Spacing.four }
                    ]}>
                        {footer}
                    </View>
                </AccentProvider>
            </View>
        </View>
    )
}

// Whether the room is still listening, as a dot and a word in the bar.
function LivePill({ live }: { live: boolean }) {
    const t = useT();
    const styles = useStyles();

    return (
        <View
            style={[styles.pill, live ? styles.pillLive : styles.pillOffline]}
            accessibilityRole='text'
            // The visible word is one beat; the label is the whole sentence.
            accessibilityLabel={live ? t('lobby.live') : t('lobby.disconnected')}
        >
            <PulseDot live={live} />

            <AppText style={[styles.pillWord, live ? styles.wordLive : styles.wordOffline]}>
                {live ? t('lobby.live') : t('lobby.offline')}
            </AppText>
        </View>
    )
}

/** The dot in the pill: breathing while connected, flat and red once not. */
function PulseDot({ live }: { live: boolean }) {
    const theme = useTheme();
    const styles = useStyles();

    const [pulse] = useState(() => new Animated.Value(1));

    useEffect(() => {
        // A dropped connection holds still.
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
            style={[
                styles.dot,
                { backgroundColor: live ? theme.colors.available : theme.colors.destructive },
                { opacity: pulse }
            ]}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the viewport this page claimed.
    screen: {
        flex: 1,
        width: '100%'
    },
    // Wide windows: the card floats in the middle of the claimed viewport.
    screenFramed: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.five
    },

    // On a phone this is a passthrough that fills the screen. `card` reshapes it.
    shell: {
        flex: 1,
        width: '100%'
    },
    // The mockup's frame: hard border, big radius, and the accent-keyed pop shadow laid on at the call site.
    card: {
        flexGrow: 0,
        flexShrink: 1,
        flexBasis: 'auto',
        maxWidth: CARD_WIDTH,
        maxHeight: '100%',
        borderRadius: 30,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.colors.background,
        overflow: 'hidden'
    },

    gameKicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 18,
        paddingTop: 10
    },
    gameIcon: {
        width: 16,
        height: 16,
        flexShrink: 0,
        borderRadius: 4
    },
    gameName: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },

    // No rule under it any more: the bar and the page separate by whitespace and by the hero's own weight, the way the design draws them.
    bar: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 18
    },

    // A wash rather than the app's hard-edged button.
    chip: {
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: theme.scheme === 'dark'
            ? 'rgba(245, 243, 239, 0.08)'
            : withAlpha(Brand.ink, 0.06)
    },

    // Takes the room between the chip and the controls.
    title: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    pill: {
        flexShrink: 0,
        height: 26,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999
    },
    pillLive: {
        backgroundColor: withAlpha(Brand.available, 0.16)
    },
    pillOffline: {
        backgroundColor: withAlpha(Brand.destructive, 0.16)
    },
    pillWord: {
        fontSize: 11,
        fontWeight: 800
    },
    // The word's greens, one per scheme.
    wordLive: {
        color: theme.scheme === 'dark' ? '#7ADE8A' : '#1E7A2B'
    },
    wordOffline: {
        color: theme.colors.destructiveText
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 999
    },

    scroll: {
        width: '100%'
    },
    // In the card the middle stops growing.
    scrollFramed: {
        flexGrow: 0
    },
    // The page's gutters, which a chromeless page has to lay down for itself.
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: 4,
        gap: 14,
        // Clears the glow the hero throws downwards.
        paddingBottom: Spacing.three
    },

    // Outside the scroller, so it is on the bottom edge whatever the page above it does, and ruled off from it.
    footer: {
        flexShrink: 0,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.two,
        borderTopWidth: 1,
        borderTopColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : 'rgba(15, 13, 18, 0.1)'
    }
}))
