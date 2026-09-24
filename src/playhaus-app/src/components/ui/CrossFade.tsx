import { useNativeDriver } from '@/components/ui/usePressPop';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
    back: ReactNode
    front: ReactNode
    style?: StyleProp<ViewStyle>
    turned: boolean
}

const OUT_MS = 80;
const IN_MS = 100;

// Fades one face out and the other in when `turned` changes; one that mounts turned simply shows its back.
export default function CrossFade({ back, front, style, turned }: Props) {
    const [showingBack, setShowingBack] = useState(turned);
    const [opacity] = useState(() => new Animated.Value(1));

    useEffect(() => {
        // Already on the asked-for face, so a fade cut short by a change of mind shows it fully again.
        if (turned === showingBack) {
            opacity.setValue(1);
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

            run = Animated.timing(opacity, {
                toValue: 0,
                duration: OUT_MS,
                easing: Easing.in(Easing.quad),
                useNativeDriver
            });

            run.start(({ finished }) => {
                if (!finished) return;

                setShowingBack(turned);

                run = Animated.timing(opacity, {
                    toValue: 1,
                    duration: IN_MS,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver
                });

                run.start();
            });
        });

        return () => {
            cancelled = true;
            run?.stop();
        };
        // Only a change of `turned` starts a fade; the face it lands on is this effect's own doing.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turned]);

    return (
        <Animated.View style={[style, { opacity }]}>
            {showingBack ? back : front}
        </Animated.View>
    )
}
