import { useNativeDriver } from '@/components/ui/usePressPop';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
    back: ReactNode
    delayMs?: number
    front: ReactNode
    style?: StyleProp<ViewStyle>
    turned: boolean
}

const HALF_MS = 190;
const PERSPECTIVE = 900;

// A card that turns over on its vertical axis when `turned` changes; one that mounts turned simply shows its back.
export default function FlipOver({ back, delayMs = 0, front, style, turned }: Props) {
    const [showingBack, setShowingBack] = useState(turned);

    // A quarter turn either way: -1 and 1 are edge-on, 0 lies flat.
    const [turn] = useState(() => new Animated.Value(0));

    useEffect(() => {
        // Already on the asked-for face, so a turn cut short by a change of mind lies flat again.
        if (turned === showingBack) {
            turn.setValue(0);
            return;
        }

        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled) return;

            if (reduced) {
                setShowingBack(turned);
                return;
            }

            run = Animated.timing(turn, {
                toValue: 1,
                duration: HALF_MS,
                delay: delayMs,
                easing: Easing.in(Easing.quad),
                useNativeDriver
            });

            run.start(({ finished }) => {
                if (!finished) return;

                // Edge-on, so swapping faces cannot be seen.
                turn.setValue(-1);
                setShowingBack(turned);

                run = Animated.timing(turn, {
                    toValue: 0,
                    duration: HALF_MS,
                    easing: Easing.out(Easing.back(1.4)),
                    useNativeDriver
                });

                run.start();
            });
        });

        return () => {
            cancelled = true;
            run?.stop();
        };
        // Only a change of `turned` starts a turn; the face it lands on is this effect's own doing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turned]);

    return (
        <Animated.View
            style={[
                style,
                {
                    transform: [
                        { perspective: PERSPECTIVE },
                        { rotateY: turn.interpolate({ inputRange: [-1, 1], outputRange: ['-90deg', '90deg'] }) }
                    ]
                }
            ]}
        >
            {showingBack ? back : front}
        </Animated.View>
    )
}
