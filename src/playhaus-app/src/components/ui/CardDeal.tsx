import { useNativeDriver } from '@/components/ui/usePressPop';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
    children: ReactNode
    // A new value deals new children in; the same value just re-renders the card on top.
    dealKey: string
    style?: StyleProp<ViewStyle>
}

interface Leaving {
    exit: Animated.Value
    key: string
    node: ReactNode
}

const EXIT_MS = 260;
const ENTER_DELAY_MS = 70;
// Fraction of the width the outgoing card travels left.
const EXIT_TRAVEL = 0.6;
const EXIT_TILT = '-6deg';
const ENTER_RISE = 24;
const ENTER_SCALE = 0.96;
const ENTER_DAMPING = 16;
const ENTER_STIFFNESS = 180;

// Swaps its children like dealing a card: the old one slides and tilts away while the new one rises into place.
export default function CardDeal({ children, dealKey, style }: Props) {
    const [deal, setDeal] = useState<{ enter: Animated.Value, key: string, leaving: Leaving | null, node: ReactNode }>(
        () => ({ enter: new Animated.Value(1), key: dealKey, leaving: null, node: children })
    );
    const [width, setWidth] = useState(0);

    // Swapped during render, so the old card never gets a frame of the new children.
    let current = deal;
    if (deal.key !== dealKey) {
        current = {
            enter: new Animated.Value(0),
            key: dealKey,
            leaving: { exit: new Animated.Value(0), key: deal.key, node: deal.node },
            node: children
        };
        setDeal(current);
    }

    const { enter, leaving } = current;

    // The outgoing card is a snapshot; the one on top always draws the latest children.
    if (current === deal && deal.node !== children) {
        setDeal({ ...deal, node: children });
    }

    useEffect(() => {
        if (leaving === null) return;

        let cancelled = false;
        let exitRun: Animated.CompositeAnimation | undefined;
        let enterRun: Animated.CompositeAnimation | undefined;

        const drop = () => setDeal(latest => latest.leaving === leaving ? { ...latest, leaving: null } : latest);

        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled) return;

            if (reduced) {
                enter.setValue(1);
                drop();
                return;
            }

            exitRun = Animated.timing(leaving.exit, {
                toValue: 1,
                duration: EXIT_MS,
                easing: Easing.in(Easing.cubic),
                useNativeDriver
            });

            enterRun = Animated.spring(enter, {
                toValue: 1,
                delay: ENTER_DELAY_MS,
                damping: ENTER_DAMPING,
                stiffness: ENTER_STIFFNESS,
                useNativeDriver
            });

            exitRun.start(({ finished }) => {
                if (finished) drop();
            });
            enterRun.start();
        });

        return () => {
            cancelled = true;
            exitRun?.stop();
            enterRun?.stop();
        };
        // Only a new deal starts a run; dropping the old card must not stop the new one mid-spring.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current.key]);

    // Keyed layers in one list, so the card on top keeps its instance when it becomes the one leaving.
    return (
        <View style={[styles.deck, style]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
            {leaving !== null && (
                <Animated.View
                    key={leaving.key}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            opacity: leaving.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                            transform: [
                                { translateX: leaving.exit.interpolate({ inputRange: [0, 1], outputRange: [0, -width * EXIT_TRAVEL] }) },
                                { rotate: leaving.exit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', EXIT_TILT] }) }
                            ]
                        }
                    ]}
                >
                    {leaving.node}
                </Animated.View>
            )}

            <Animated.View
                key={current.key}
                style={[
                    styles.card,
                    {
                        opacity: enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                        transform: [
                            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [ENTER_RISE, 0] }) },
                            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [ENTER_SCALE, 1] }) }
                        ]
                    }
                ]}
            >
                {children}
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    deck: {
        flex: 1,
        minHeight: 0
    },

    card: {
        flex: 1,
        minHeight: 0
    }
});
