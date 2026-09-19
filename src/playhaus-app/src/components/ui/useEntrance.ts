import { useNativeDriver } from '@/components/ui/usePressPop';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type EasingFunction } from 'react-native';

interface Options {
    delayMs?: number
    durationMs: number
    easing?: EasingFunction
}

// Runs 0 → 1 once on mount; someone who asked the OS for less movement gets 1 straight away.
export function useEntrance({ delayMs = 0, durationMs, easing = Easing.out(Easing.cubic) }: Options): Animated.Value {
    const [progress] = useState(() => new Animated.Value(0));

    useEffect(() => {
        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled) return;

            if (reduced) {
                progress.setValue(1);
                return;
            }

            run = Animated.timing(progress, {
                toValue: 1,
                duration: durationMs,
                delay: delayMs,
                easing,
                useNativeDriver
            });

            run.start();
        });

        return () => {
            cancelled = true;
            run?.stop();
        };
        // The timings are read once by design.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return progress;
}
