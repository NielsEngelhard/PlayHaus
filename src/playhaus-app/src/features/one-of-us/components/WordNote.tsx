import AppText from '@/components/text/AppText';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { useEntrance } from '@/components/ui/useEntrance';
import { useNativeDriver, usePressPop } from '@/components/ui/usePressPop';
import { Brand, Gradients } from '@/constants/theme';
import PinnedNote, { NotePin } from '@/features/one-of-us/components/PinnedNote';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

interface Props {
    /** The line under the word — who else is holding what. */
    blurb: string
    coverHint: string
    coverLabel: string
    /** Skips the cover. For a board where nobody else can be looking at this screen. */
    initiallyRevealed?: boolean
    /** The micro-label on the note itself, e.g. "Jouw woord". */
    label: string
    onReveal?: () => void
    /** What to print for the player who was dealt a blank briefje. */
    whenBlank: string
    word: string | null
}

// The briefje you were dealt, still on the stack it was drawn from, face down until you take it.
export default function WordNote({
    blurb,
    coverHint,
    coverLabel,
    initiallyRevealed = false,
    label,
    onReveal,
    whenBlank,
    word
}: Props) {
    const styles = useStyles();
    const pop = usePressPop();

    const [revealed, setRevealed] = useState(initiallyRevealed);
    const [turning, setTurning] = useState(false);

    const deal = useEntrance({ durationMs: DEAL_MS, easing: Easing.out(Easing.back(1.2)) });

    // 0 on the stack, 1 held up off it.
    const [pick] = useState(() => new Animated.Value(0));
    // A quarter turn either way: -1 and 1 are edge-on, 0 lies flat.
    const [flip] = useState(() => new Animated.Value(0));
    const [nudge] = useState(() => new Animated.Value(0));

    const text = word === null || word === '' ? whenBlank : word;

    useEffect(() => () => {
        pick.stopAnimation();
        flip.stopAnimation();
    }, [pick, flip]);

    // An occasional wiggle while it is still face down, so the stack reads as something to take.
    useEffect(() => {
        if (revealed || turning) return;

        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled || reduced) return;

            const tilt = (toValue: number) => Animated.timing(nudge, {
                toValue,
                duration: NUDGE_MS,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver
            });

            run = Animated.loop(Animated.sequence([
                Animated.delay(NUDGE_REST_MS),
                tilt(1),
                tilt(-1),
                tilt(0.5),
                tilt(0)
            ]));

            run.start();
        });

        return () => {
            cancelled = true;
            run?.stop();
            nudge.setValue(0);
        };
    }, [revealed, turning, nudge]);

    function turnOver() {
        setRevealed(true);
        if (onReveal !== undefined) onReveal();
    }

    function reveal() {
        if (turning) return;
        setTurning(true);

        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (reduced) {
                turnOver();
                return;
            }

            Animated.parallel([
                Animated.timing(pick, {
                    toValue: 1,
                    duration: LIFT_MS,
                    easing: Easing.out(Easing.back(1.6)),
                    useNativeDriver
                }),
                Animated.timing(flip, {
                    toValue: 1,
                    duration: FLIP_HALF_MS,
                    delay: LIFT_MS - FLIP_HALF_MS,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver
                })
            ]).start(({ finished }) => {
                if (!finished) return;

                // Edge-on, so swapping what is printed on it cannot be seen.
                flip.setValue(-1);
                turnOver();

                Animated.parallel([
                    Animated.timing(flip, {
                        toValue: 0,
                        duration: FLIP_HALF_MS,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver
                    }),
                    Animated.spring(pick, {
                        toValue: 0,
                        delay: FLIP_HALF_MS / 2,
                        friction: 5,
                        tension: 90,
                        useNativeDriver
                    })
                ]).start();
            });
        });
    }

    // The rest of the deal fans out as it lands, and a little further while yours is held up.
    const spread = Animated.add(deal, pick);
    const fan = (angle: number) => spread.interpolate({
        inputRange: [0, 1, 2],
        outputRange: ['0deg', `${angle}deg`, `${angle * FAN_HELD}deg`]
    });

    const shown = deal.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });

    const dealt = {
        opacity: shown,
        transform: [
            { translateY: deal.interpolate({ inputRange: [0, 1], outputRange: [DEAL_DROP, 0] }) },
            { rotate: deal.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] }) }
        ]
    };

    const held = {
        transform: [
            { perspective: PERSPECTIVE },
            { translateY: pick.interpolate({ inputRange: [0, 1], outputRange: [0, -LIFT] }) },
            { scale: pick.interpolate({ inputRange: [0, 1], outputRange: [1, LIFT_SCALE] }) },
            { rotate: nudge.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) },
            { rotateY: flip.interpolate({ inputRange: [-1, 1], outputRange: ['-90deg', '90deg'] }) }
        ]
    };

    return (
        <View style={styles.stack}>
            {/* The rest of the deal, still face down under yours. */}
            <Animated.View
                style={[styles.backing, styles.backingFar, { opacity: shown, transform: [{ rotate: fan(6) }] }]}
                accessibilityElementsHidden
                importantForAccessibility='no-hide-descendants'
            />

            <Animated.View
                style={[styles.backing, styles.backingNear, { opacity: shown, transform: [{ rotate: fan(-4) }] }]}
                accessibilityElementsHidden
                importantForAccessibility='no-hide-descendants'
            />

            <Animated.View style={dealt}>
                <Animated.View style={held}>
                    <PinnedNote index={1} style={styles.front}>
                        <NotePin size={16} />

                        {revealed ? (
                            <>
                                <AppText style={styles.label}>{label}</AppText>

                                <AppText style={[styles.word, { fontSize: wordSize(text) }]}>
                                    {text}
                                </AppText>

                                <AppText style={styles.blurb}>{blurb}</AppText>
                            </>
                        ) : (
                            <AnimatedPressable
                                onPress={reveal}
                                disabled={turning}
                                onPressIn={pop.onPressIn}
                                onPressOut={pop.onPressOut}
                                onHoverIn={pop.onHoverIn}
                                onHoverOut={pop.onHoverOut}
                                accessibilityRole='button'
                                accessibilityLabel={coverLabel}
                                style={[styles.cover, pop.animatedStyle]}
                            >
                                <View style={styles.eye}>
                                    <Feather name='eye' size={18} color={Brand.ink} />
                                </View>

                                <AppText style={styles.coverLabel}>{coverLabel}</AppText>

                                <AppText style={styles.blurb}>{coverHint}</AppText>
                            </AnimatedPressable>
                        )}
                    </PinnedNote>
                </Animated.View>
            </Animated.View>
        </View>
    )
}

/** A briefje can hold a whole sentence, so the ink shrinks rather than the paper growing without end. */
function wordSize(text: string): number {
    if (text.length > 28) return 17;
    if (text.length > 16) return 21;

    return 26;
}

const NOTE_WIDTH = 224;

const DEAL_MS = 520;
const DEAL_DROP = 56;
const LIFT_MS = 340;
const LIFT = 28;
const LIFT_SCALE = 1.08;
const FAN_HELD = 1.6;
const FLIP_HALF_MS = 180;
const NUDGE_MS = 110;
const NUDGE_REST_MS = 2600;
const PERSPECTIVE = 900;

const useStyles = createThemedStyles(theme => ({
    stack: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },

    // Both backings sit behind the front note rather than in the flow, so the stack is only ever as tall as the note on top.
    // Inset rather than sized: a percentage height would collapse against the stack's own auto height on the web.
    backing: {
        position: 'absolute',
        top: -4,
        bottom: -4,
        width: NOTE_WIDTH - 8,
        borderRadius: 5,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    backingFar: {
        backgroundColor: Gradients.violet[0]
    },

    backingNear: {
        backgroundColor: theme.colors.backgroundSecondary
    },

    front: {
        width: NOTE_WIDTH,
        alignItems: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 14,
        // A rung heavier than every other note: this is the one that was actually drawn.
        borderWidth: theme.borderWidth + 1,
        ...theme.shadows.hardLarge
    },

    label: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    word: {
        fontWeight: 900,
        letterSpacing: -1,
        textAlign: 'center',
        color: theme.colors.text
    },

    blurb: {
        fontSize: 11.5,
        lineHeight: 11.5 * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },

    cover: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10
    },

    // Lemon, the one warm thing on a note that is still face down.
    eye: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    coverLabel: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        textAlign: 'center',
        color: theme.colors.text
    }
}))
