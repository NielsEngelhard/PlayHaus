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

/**
 * Where the page stops being a phone screen and becomes a card on the canvas.
 *
 * Past this the window is wide enough that the card plus a visible margin of dot grid
 * beats edge-to-edge, which at that size reads as a stretched phone. Web only: a tablet
 * held sideways is still a device in a hand, and a frame inside its bezel is a frame
 * inside a frame.
 */
const FRAME_AT = 700;

/** The card, at its widest. A touch over the mockup's 390, since desktop rows run longer. */
const CARD_WIDTH = 460;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Opacity is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath. The dot fades out over this, then back in over it. */
const PULSE_MS = 1000;

/**
 * The shape every lobby shares: the game's ribbon, a quiet bar, the code as a headline
 * when there is one to hand out, a scrolling middle, and a pinned footer.
 *
 * On a phone it owns the whole viewport, ribbon under the notch and footer over the home
 * indicator. On a wide window it becomes the card the design was drawn as — bordered,
 * rounded, floating on the app's own dot grid — with the same tree either way: only the
 * styles switch on `framed`, never the elements, because remounting this page would tear
 * down and rejoin the room's socket.
 */
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

    // Static prerender sees a width of zero and renders the phone branch, which is the
    // right default for a page that is mobile-first anyway.
    const { width: windowWidth } = useWindowDimensions();
    const framed = Platform.OS === 'web' && windowWidth >= FRAME_AT;

    const accent = accentOf(game);

    return (
        <View style={[styles.screen, framed && styles.screenFramed]}>
            <View style={[styles.shell, framed && [styles.card, theme.popShadow(accent.color)]]}>
                {/* On a phone the ribbon absorbs the notch: the accent runs up under the
                    status bar rather than leaving a dead strip above itself. */}
                <View style={{
                    height: STRIP_HEIGHT + (framed ? 0 : insets.top),
                    backgroundColor: accent.color
                }} />

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

/**
 * Whether the room is still listening, as a dot and a word in the bar.
 *
 * The code no longer lives up here — it is the headline of the hero now, or the guest's
 * own title — so the pill's whole job is the one bit of state a lobby you are sitting in
 * can surprise you with. Green and breathing while it holds; red, flat and renamed the
 * moment it breaks.
 */
function LivePill({ live }: { live: boolean }) {
    const t = useT();
    const styles = useStyles();

    return (
        <View
            style={[styles.pill, live ? styles.pillLive : styles.pillOffline]}
            accessibilityRole='text'
            // The visible word is one beat; the label is the whole sentence, so a screen
            // reader hears what actually happened rather than just "offline".
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
            style={[
                styles.dot,
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
    // Wide windows: the card floats in the middle of the claimed viewport, and the dot
    // grid the layout paints behind every page becomes the canvas around it.
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
    // The mockup's frame: hard border, big radius, and the accent-keyed pop shadow laid
    // on at the call site. `overflow: hidden` is what clips the ribbon into the corners.
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

    // No rule under it any more: the bar and the page separate by whitespace and by the
    // hero's own weight, the way the design draws them.
    bar: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 18
    },

    // A wash rather than the app's hard-edged button: the bar is chrome on a page whose
    // loud thing is the hero, so its controls sit back.
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
    // The word's greens, one per scheme: `Brand.available` itself is tuned to be a fill,
    // and as text on its own 16% tint it lands just short of readable either way.
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
    // In the card the middle stops growing: the card hugs its content and only scrolls
    // when the window is shorter than the lobby. The outer chrome cannot scroll for it —
    // the layout's scroller is off for chromeless pages.
    scrollFramed: {
        flexGrow: 0
    },
    // The page's gutters, which a chromeless page has to lay down for itself. The hero is
    // just the first thing in the column now — no full-bleed band, no negative margins.
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: 4,
        gap: 14,
        // Clears the glow the hero throws downwards, which paints outside its own box and
        // would otherwise be cropped by the scroller's bottom edge.
        paddingBottom: Spacing.three
    },

    // Outside the scroller, so it is on the bottom edge whatever the page above it does,
    // and ruled off from it — the one line the design keeps. The bottom padding is set at
    // the call site, from the device's own inset.
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
