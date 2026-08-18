import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Platform, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";

interface Props {
    /**
     * Rains once each time this turns on. Leaving it on does not keep it going — a
     * celebration is a moment, not a weather condition.
     */
    active: boolean,
    /** For layout only. The fall fills whatever box this ends up covering. */
    style?: StyleProp<ViewStyle>
}

/**
 * Few enough to read as a flourish rather than a screen wipe. The point is to catch the
 * eye on the way past the board, not to bury it.
 */
const PIECE_COUNT = 24;

/** Roughly how long one piece takes to cross the screen, before its own variation. */
const FALL_MS = 2400;
/**
 * How far apart the first and last piece start. Releasing them all at once reads as a
 * single falling line; spread out, it reads as a shower.
 */
const SPREAD_MS = 900;

// react-native-web has no native animation module, so asking for one there is a console
// warning and nothing else. Transforms and opacity are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * The app's accents. Anything outside the palette makes the fall look bolted on.
 *
 * Read from `Brand` at module scope rather than through the theme: paper confetti is
 * the same paper confetti in either scheme, and the pieces are rolled once per mount.
 */
const PIECE_COLORS = [
    Brand.primary,
    Brand.secondary,
    Brand.lemon,
    Brand.mint,
    Brand.blush
];

interface Piece {
    /** Where it starts across the width, as a fraction of it. */
    x: number,
    width: number,
    height: number,
    color: string,
    /** Circles among the strips, so the shower is not one shape repeated. */
    round: boolean,
    delay: number,
    duration: number,
    /** How far it has wandered sideways by the time it lands, in points. */
    drift: number,
    /** How wide it swings on the way down. */
    sway: number,
    /** Total turn, in degrees. Signed, so half of them spin the other way. */
    spin: number,
    /** 0 at the top edge, 1 past the bottom one. */
    progress: Animated.Value
}

function spread(range: number): number {
    return (Math.random() * 2 - 1) * range;
}

/**
 * Built once per mount and reused for every fall. Re-rolling them each time would be more
 * varied, but it would also mean a fresh set of `Animated.Value`s on a component that is
 * mounted for the whole game.
 */
function makePieces(): Piece[] {
    return Array.from({ length: PIECE_COUNT }, () => {
        const round = Math.random() < 0.3;
        const width = 6 + Math.round(Math.random() * 5);

        return {
            // Held off the right-hand edge, which a piece placed at a flat 100% would hang over.
            x: Math.random() * 0.94,
            width,
            // Strips are taller than they are wide, which is what makes the spin legible.
            height: round ? width : Math.round(width * (1.4 + Math.random())),
            color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
            round,
            delay: Math.round(Math.random() * SPREAD_MS),
            duration: FALL_MS + Math.round(Math.random() * 1100),
            drift: spread(60),
            sway: spread(26),
            spin: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.round(Math.random() * 540)),
            progress: new Animated.Value(0)
        };
    });
}

/**
 * A shower of paper from the top edge of whatever it is dropped into.
 *
 * Sits over its siblings without taking part in the layout and never takes a touch, so it
 * can be laid across a live screen — the keyboard underneath keeps working while it falls.
 */
export default function Confetti({ active, style }: Props) {
    const styles = useStyles();

    const window = useWindowDimensions();
    const [pieces] = useState(makePieces);
    /**
     * Measured rather than taken from the window: the fall usually covers a slice of the
     * screen under a header, and pieces that stop short of the bottom edge of that slice
     * pop out of existence in mid-air.
     */
    const [height, setHeight] = useState(0);
    /** Kept mounted for the tail of the fall, which outlasts `active` on a short round. */
    const [falling, setFalling] = useState(active);

    const distance = height || window.height;

    // Turned on during render rather than from the effect: the pieces have to be on screen
    // in the same pass that starts them, or the fall opens on a frame of nothing.
    const [ran, setRan] = useState(active);
    if (ran !== active) {
        setRan(active);
        if (active) setFalling(true);
    }

    useEffect(() => {
        if (!active) return;

        const fall = Animated.parallel(pieces.map(piece => Animated.sequence([
            Animated.delay(piece.delay),
            Animated.timing(piece.progress, {
                toValue: 1,
                duration: piece.duration,
                // Paper hits its terminal speed almost at once, so there is no accelerating
                // to do. The sway and the spin are what keep it from looking dropped.
                easing: Easing.linear,
                useNativeDriver
            })
        ])));

        fall.start(({ finished }) => {
            if (finished) setFalling(false);
        });

        return () => {
            fall.stop();
            pieces.forEach(piece => piece.progress.setValue(0));
        };
    }, [active, pieces]);

    function measure(event: LayoutChangeEvent) {
        setHeight(event.nativeEvent.layout.height);
    }

    return (
        <View
            style={[StyleSheet.absoluteFill, style]}
            onLayout={measure}
            pointerEvents='none'
            // Decoration. Announcing two dozen falling rectangles helps nobody.
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
        >
            {falling && pieces.map((piece, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.piece,
                        {
                            left: `${piece.x * 100}%`,
                            width: piece.width,
                            height: piece.height,
                            backgroundColor: piece.color,
                            borderRadius: piece.round ? piece.width : 2,
                            // Fades in off the top edge and out before it lands, so no piece
                            // is ever seen arriving from or stopping at nowhere.
                            opacity: piece.progress.interpolate({
                                inputRange: [0, 0.06, 0.8, 1],
                                outputRange: [0, 1, 1, 0]
                            }),
                            transform: [
                                {
                                    translateY: piece.progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-piece.height - 8, distance + piece.height]
                                    })
                                },
                                {
                                    translateX: piece.progress.interpolate({
                                        inputRange: [0, 0.33, 0.66, 1],
                                        outputRange: [0, piece.sway, -piece.sway, piece.drift]
                                    })
                                },
                                {
                                    rotate: piece.progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', `${piece.spin}deg`]
                                    })
                                }
                            ]
                        }
                    ]}
                />
            ))}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    piece: {
        position: 'absolute',
        top: 0,
        // The hairline the rest of the app draws around everything. At this size it reads as
        // weight rather than as an outline, and without it the pale pieces vanish on the canvas.
        borderWidth: 1,
        borderColor: theme.colors.border
    }
}))
