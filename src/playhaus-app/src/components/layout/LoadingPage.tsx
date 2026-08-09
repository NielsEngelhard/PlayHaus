import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

interface Props {
    /** The line under the tiles. Say what is being waited for, not that waiting is happening. */
    message?: string
}

/**
 * A tile per letter, each one on its own accent, hopping in a wave.
 *
 * This app has no spinners: a ring going round is the one shape the rest of the
 * UI never makes. The tiles are the same object the games are built from — hard
 * border, hard shadow, a hair off-square — so a wait looks like the app rather
 * than like a widget borrowed from somewhere else.
 */
const TILES = [
    { letter: 'P', color: Colors.light.lemon,     foreground: Colors.light.text,        tilt: -4 },
    { letter: 'L', color: Colors.light.primary,   foreground: Colors.light.textOnAccent, tilt: 5 },
    { letter: 'A', color: Colors.light.mint,      foreground: Colors.light.text,        tilt: -3 },
    { letter: 'Y', color: Colors.light.secondary, foreground: Colors.light.textOnAccent, tilt: 4 }
];

const TILE_SIZE = 56;
const HOP_HEIGHT = 20;

const RISE_MS = 240;
const FALL_MS = 280;
/** Gap between one tile leaving the ground and the next. */
const STAGGER_MS = 110;
/**
 * One full turn of the wave, the same for every tile. Holding the cycle constant
 * rather than letting each tile take as long as it needs is what keeps them in
 * phase over minutes instead of drifting apart.
 */
const CYCLE_MS = 1200;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

export default function LoadingPage({ message = 'Even geduld…' }: Props) {
    // One value per tile, built once by the lazy initialiser: re-creating them on
    // a render would drop the wave back to the floor mid-hop. State rather than a
    // ref because these are read while rendering, to build the transforms.
    const [hops] = useState(() => TILES.map(() => new Animated.Value(0)));

    useEffect(() => {
        const animations = hops.map((hop, index) => {
            const lead = index * STAGGER_MS;

            return Animated.loop(
                Animated.sequence([
                    Animated.delay(lead),
                    Animated.timing(hop, {
                        toValue: 1,
                        duration: RISE_MS,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver
                    }),
                    Animated.timing(hop, {
                        toValue: 0,
                        duration: FALL_MS,
                        // Falls faster than it rose, the way a thrown thing does.
                        easing: Easing.bounce,
                        useNativeDriver
                    }),
                    // Pads every tile out to the same cycle, so the last one landing
                    // and the first one leaving stay a fixed beat apart.
                    Animated.delay(CYCLE_MS - lead - RISE_MS - FALL_MS)
                ])
            );
        });

        animations.forEach(animation => animation.start());

        return () => animations.forEach(animation => animation.stop());
    }, [hops]);

    return (
        <View style={styles.container} accessibilityRole='progressbar' accessibilityLabel={message}>
            <View style={styles.row}>
                {TILES.map((tile, index) => (
                    <Animated.View
                        key={tile.letter}
                        style={[
                            styles.tile,
                            { backgroundColor: tile.color },
                            {
                                transform: [
                                    {
                                        translateY: hops[index].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, -HOP_HEIGHT]
                                        })
                                    },
                                    {
                                        // Straightens up as it rises, so the wave has a
                                        // flick to it rather than just going up and down.
                                        rotate: hops[index].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [`${tile.tilt}deg`, `${-tile.tilt * 0.6}deg`]
                                        })
                                    },
                                    {
                                        scale: hops[index].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 1.06]
                                        })
                                    }
                                ]
                            }
                        ]}
                    >
                        <AppText style={[styles.letter, { color: tile.foreground }]}>
                            {tile.letter}
                        </AppText>
                    </Animated.View>
                ))}
            </View>

            <AppText style={styles.message}>{message}</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.six,
        gap: Spacing.five
    },
    row: {
        flexDirection: 'row',
        // The tiles hop out of their own box, and the row is centred anyway, so it
        // needs the headroom rather than the tiles needing to be clipped.
        alignItems: 'flex-end',
        height: TILE_SIZE + HOP_HEIGHT,
        gap: Spacing.two
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        ...Shadows.hardLarge
    },
    letter: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        letterSpacing: -0.5
    },
    message: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    }
})
