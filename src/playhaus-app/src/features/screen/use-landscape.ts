import { lockAsync, OrientationLock, unlockAsync } from "expo-screen-orientation";
import { useEffect } from "react";

// The board is drawn 1280x720, so a phone being mirrored to a television turns with it. The app is portrait everywhere else.
export function useLandscape(): void {
    useEffect(() => {
        void lockAsync(OrientationLock.LANDSCAPE).catch(() => { });

        return () => { void unlockAsync().catch(() => { }); };
    }, []);
}
