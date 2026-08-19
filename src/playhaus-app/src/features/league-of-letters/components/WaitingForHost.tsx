import AppText from "@/components/text/AppText";
import { gameBySlug } from "@/constants/games";
import { Brand, Gradients, Spacing, linearGradient } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";

interface Props {
    /** Whoever opened the room. Named, so the wait has somebody at the end of it. */
    hostName: string
}

// react-native-web has no native animation module, so asking for one there is a console
// warning and nothing else. Transforms and opacity are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath of the halo. Slow on purpose — this is a screen you sit in front of. */
const BREATHE_MS = 1300;

/**
 * One full turn of the three-dot wave, the same for every dot, and how far behind each
 * other they leave. Holding the cycle constant rather than letting each dot take as long
 * as it needs is what keeps them in phase over minutes instead of drifting apart — the
 * same trick `LoadingPage` plays.
 */
const BOUNCE_MS = 1400;
const BOUNCE_STAGGER_MS = 180;
const BOUNCE_RISE_MS = 420;
const BOUNCE_FALL_MS = 420;
const BOUNCE_HEIGHT = 7;

const HALO_SIZE = 120;
const GLYPH_SIZE = 92;
const TILE_SIZE = 52;

const DOTS = [0, 1, 2];

/**
 * The whole of a guest's screen above the roster: the game's own glyph, breathing, and
 * one line about whose turn it is to do something.
 *
 * A guest can do exactly nothing here — they cannot change a setting, invite anybody or
 * start the game — so the screen is built to be looked at rather than used. The motion is
 * the point: something that moves is the only way a page with no controls says it is
 * still connected, which is the one question anybody staring at it actually has.
 */
export default function WaitingForHost({ hostName }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    // The same glyph, gradient and ink the game wears on the home card, from the one
    // registry that decides them. See `constants/games.ts`.
    const game = gameBySlug('league-of-letters');

    const [breathe] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(breathe, {
                    toValue: 1,
                    duration: BREATHE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(breathe, {
                    toValue: 0,
                    duration: BREATHE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [breathe]);

    return (
        <View style={styles.container}>
            <View style={styles.halo}>
                {/*
                  * Grows as it fades, so the glyph reads as sitting in something rather
                  * than as having a ring drawn round it.
                  */}
                <Animated.View
                    style={[
                        styles.glow,
                        {
                            opacity: breathe.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 0.15]
                            }),
                            transform: [{
                                scale: breathe.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.12]
                                })
                            }]
                        }
                    ]}
                />

                <View style={styles.glyphRing}>
                    <View style={[styles.tile, linearGradient(game?.gradient ?? Gradients.primary)]}>
                        <AppText
                            style={[
                                styles.glyph,
                                { color: game?.glyphInk[theme.scheme] ?? Brand.textOnAccent }
                            ]}
                        >
                            {(game?.name ?? 'L')[0]}
                        </AppText>
                    </View>
                </View>
            </View>

            <AppText style={styles.title}>Wachten op de host</AppText>

            <AppText style={styles.body}>
                {hostName} zet het spel klaar. Blijf op dit scherm — het start hier meteen mee.
            </AppText>

            <View style={styles.dots} accessibilityRole='progressbar' accessibilityLabel='Wachten'>
                {DOTS.map(index => <BouncingDot key={index} index={index} />)}
            </View>
        </View>
    )
}

/** One of the three dots under the message, hopping a beat behind the one before it. */
function BouncingDot({ index }: { index: number }) {
    const styles = useStyles();

    const [hop] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const lead = index * BOUNCE_STAGGER_MS;

        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(lead),
                Animated.timing(hop, {
                    toValue: 1,
                    duration: BOUNCE_RISE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(hop, {
                    toValue: 0,
                    duration: BOUNCE_FALL_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                // Pads every dot out to the same cycle. Stays positive for the last dot,
                // which is what the numbers above are chosen to guarantee.
                Animated.delay(BOUNCE_MS - lead - BOUNCE_RISE_MS - BOUNCE_FALL_MS)
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [hop, index]);

    return (
        <Animated.View
            style={[
                styles.dot,
                {
                    opacity: hop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                    transform: [{
                        translateY: hop.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -BOUNCE_HEIGHT]
                        })
                    }]
                }
            ]}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        alignItems: 'center'
    },
    halo: {
        width: HALO_SIZE,
        height: HALO_SIZE,
        alignItems: 'center',
        justifyContent: 'center'
    },
    // Behind everything, at the halo's full size, so what grows is the glow and not the
    // layout: a breathing element that took part in it would shove the page up and down.
    glow: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: 999,
        backgroundColor: theme.colors.primary
    },
    glyphRing: {
        width: GLYPH_SIZE,
        height: GLYPH_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.backgroundFocus
            : theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '3px 3px 0 0 #0F0D12' })
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 15,
        // Only light outlines the tile. In dark the gradient is the brightest thing on
        // the screen already, and a grey line around it would only mute it.
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        // A lit top edge, so the tile reads as domed rather than printed.
        boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.35)'
    },
    glyph: {
        fontSize: 30,
        fontWeight: 900,
        letterSpacing: -1
    },
    title: {
        marginTop: 20,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.9,
        color: theme.colors.text
    },
    body: {
        marginTop: Spacing.two,
        maxWidth: 260,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 14 * 1.5,
        color: theme.colors.textSecondary
    },
    dots: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 6,
        // The dots hop out of their own box, so the row keeps the headroom rather than
        // letting them be clipped.
        height: 8 + BOUNCE_HEIGHT,
        alignItems: 'flex-end'
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: theme.colors.primary
    }
}))
