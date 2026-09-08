import { playBubble } from "@/utils/bubble-sound";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

// How far in the press pushes, and how far back past resting size it comes on the way out.
const PRESSED_SCALE = 0.95;
const POP_SCALE = 1.04;

/** Down under the finger, out past resting size, then back down to rest. */
const PRESS_MS = 90;
const POP_MS = 120;
const SETTLE_MS = 150;

interface Props extends Omit<PressableProps, 'style' | 'children'> {
    children: ReactNode
    /** For layout and looks both — this component only adds the transform. */
    style?: StyleProp<ViewStyle>
}

// A `Pressable` that squashes under the finger and pops back out a hair proud of where it started, with a bubble to go with it.
export default function PopPressable({ children, style, onPressIn, onPressOut, ...rest }: Props) {
    // How far the control is pushed in.
    const [push] = useState(() => new Animated.Value(0));

    // A press released as the screen goes away would otherwise animate a dead value.
    useEffect(() => () => push.stopAnimation(), [push]);

    return (
        <AnimatedPressable
            {...rest}
            onPressIn={event => {
                playBubble();

                Animated.timing(push, {
                    toValue: 1,
                    duration: PRESS_MS,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver
                }).start();

                onPressIn?.(event);
            }}
            onPressOut={event => {
                // A tap is usually over long before the press-in finishes, so this runs from a half-pressed key more often than not.
                Animated.sequence([
                    Animated.timing(push, {
                        toValue: -1,
                        duration: POP_MS,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver
                    }),
                    Animated.timing(push, {
                        toValue: 0,
                        duration: SETTLE_MS,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver
                    })
                ]).start();

                onPressOut?.(event);
            }}
            style={[
                style,
                {
                    transform: [{
                        scale: push.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [POP_SCALE, 1, PRESSED_SCALE]
                        })
                    }]
                }
            ]}
        >
            {children}
        </AnimatedPressable>
    )
}
