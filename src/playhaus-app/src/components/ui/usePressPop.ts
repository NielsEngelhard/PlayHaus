import { useEffect, useState } from "react";
import { Animated, Easing, Platform, type GestureResponderEvent } from "react-native";

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
export const useNativeDriver = Platform.OS !== 'web';

const PRESSED_SCALE = 0.95;
const POP_SCALE = 1.04;
const HOVER_SCALE = 1.02;

const PRESS_MS = 90;
const POP_MS = 120;
const SETTLE_MS = 150;
const HOVER_MS = 120;

export interface PressPopOptions {
    pressedScale?: number
    popScale?: number
    hoverScale?: number
    /** False turns this into a hover-only effect — for controls like Toggle that already have their own press feedback. */
    pressEnabled?: boolean
}

export interface PressPop {
    animatedStyle: Animated.WithAnimatedValue<{ transform: [{ scale: number }] }>
    onPressIn: (event: GestureResponderEvent) => void
    onPressOut: (event: GestureResponderEvent) => void
    onHoverIn: () => void
    onHoverOut: () => void
}

/** Press squash-and-pop plus a web hover scale-up, shared by PopPressable and every other tappable control. */
export function usePressPop(options?: PressPopOptions): PressPop {
    const pressedScale = options?.pressedScale ?? PRESSED_SCALE;
    const popScale = options?.popScale ?? POP_SCALE;
    const hoverScale = options?.hoverScale ?? HOVER_SCALE;
    const pressEnabled = options?.pressEnabled ?? true;

    const [press] = useState(() => new Animated.Value(0));
    const [hover] = useState(() => new Animated.Value(0));

    // A press or hover released as the screen goes away would otherwise animate a dead value.
    useEffect(() => () => {
        press.stopAnimation();
        hover.stopAnimation();
    }, [press, hover]);

    const pressInterp = press.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [popScale, 1, pressedScale]
    });
    const hoverInterp = hover.interpolate({
        inputRange: [0, 1],
        outputRange: [1, hoverScale]
    });

    return {
        animatedStyle: {
            transform: [{ scale: Animated.multiply(pressInterp, hoverInterp) }]
        },
        onPressIn: () => {
            if (!pressEnabled) return;

            Animated.timing(press, {
                toValue: 1,
                duration: PRESS_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver
            }).start();
        },
        onPressOut: () => {
            if (!pressEnabled) return;

            // A tap is usually over long before the press-in finishes, so this runs from a half-pressed key more often than not.
            Animated.sequence([
                Animated.timing(press, {
                    toValue: -1,
                    duration: POP_MS,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(press, {
                    toValue: 0,
                    duration: SETTLE_MS,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver
                })
            ]).start();
        },
        onHoverIn: () => {
            Animated.timing(hover, {
                toValue: 1,
                duration: HOVER_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver
            }).start();
        },
        onHoverOut: () => {
            Animated.timing(hover, {
                toValue: 0,
                duration: HOVER_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver
            }).start();
        }
    };
}
