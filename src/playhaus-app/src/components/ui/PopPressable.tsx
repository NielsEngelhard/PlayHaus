import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { playBubble } from "@/utils/bubble-sound";
import type { ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

interface Props extends Omit<PressableProps, 'style' | 'children'> {
    children: ReactNode
    /** For layout and looks both — this component only adds the transform. */
    style?: StyleProp<ViewStyle>
}

// A `Pressable` that squashes under the finger and pops back out a hair proud of where it started, with a bubble to go with it. Scales up a hair on web hover too.
export default function PopPressable({ children, style, onPressIn, onPressOut, disabled, ...rest }: Props) {
    const pop = usePressPop();

    return (
        <AnimatedPressable
            {...rest}
            disabled={disabled}
            onPressIn={event => {
                playBubble();
                pop.onPressIn(event);
                onPressIn?.(event);
            }}
            onPressOut={event => {
                pop.onPressOut(event);
                onPressOut?.(event);
            }}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            style={[style, pop.animatedStyle]}
        >
            {children}
        </AnimatedPressable>
    )
}
