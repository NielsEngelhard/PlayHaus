import { playScene, stopMusic } from "@/features/audio/music-player";
import type { MusicScene } from "@/features/audio/music-tracks";
import { useAuth } from "@/features/auth/useAuth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Claims the soundtrack for as long as the claiming component is mounted, or hands it back with `null`.
const MusicContext = createContext<(scene: MusicScene | null) => void>(() => { });

// Which scene currently holds the soundtrack, or `null` where the app is silent.
const MusicSceneContext = createContext<MusicScene | null>(null);

// Decides what is playing, for the whole app.
export function MusicProvider({ children }: { children: ReactNode }) {
    const { status, user } = useAuth();
    const [scene, setScene] = useState<MusicScene | null>(null);

    // Gated on the session rather than on the splash screen.
    const enabled = status === 'signedIn' && user?.enableMusic === true;

    useEffect(() => {
        // Keyed on `enabled` as well as the scene.
        if (!enabled || scene === null) {
            stopMusic();

            return;
        }

        playScene(scene);
    }, [enabled, scene]);

    return (
        <MusicContext.Provider value={setScene}>
            <MusicSceneContext.Provider value={scene}>
                {children}
            </MusicSceneContext.Provider>
        </MusicContext.Provider>
    )
}

// Which scene has the soundtrack right now, or `null` where the app is silent.
export function useMusicScene(): MusicScene | null {
    return useContext(MusicSceneContext);
}

// Play something suitable for `scene` for as long as this component is mounted.
export function useMusic(scene: MusicScene) {
    const claim = useContext(MusicContext);

    useEffect(() => {
        claim(scene);

        return () => claim(null);
    }, [claim, scene]);
}
