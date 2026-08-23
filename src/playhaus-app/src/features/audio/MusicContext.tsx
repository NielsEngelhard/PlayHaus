import { playScene, stopMusic } from "@/features/audio/music-player";
import type { MusicScene } from "@/features/audio/music-tracks";
import { useAuth } from "@/features/auth/useAuth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Claims the soundtrack for as long as the claiming component is mounted, or hands it back with
 * `null`. Stable across renders — it is `useState`'s own setter.
 */
const MusicContext = createContext<(scene: MusicScene | null) => void>(() => { });

/**
 * Which scene currently holds the soundtrack, or `null` where the app is silent.
 *
 * Separate from the setter above so that claiming music and *knowing about* music stay
 * independent: the lobby and the board only ever write, and the header only ever reads.
 */
const MusicSceneContext = createContext<MusicScene | null>(null);

/**
 * Decides what is playing, for the whole app.
 *
 * Nothing, most of the time. Music belongs to the two places worth scoring — a room waiting to
 * start, and a game being played — and the home screen, every menu, list and settings page is
 * silent. A loop running under someone reading their profile is a loop nobody asked for, and the
 * app is not so large that arriving anywhere feels like the music dropped out.
 *
 * League of Letters is the only game that claims it so far. The other two are welcome to, and
 * the scenes are named for what a place *is* rather than for that game, so they can.
 *
 * A claim rather than a table of routes, because neither place is a route: the solo game and the
 * multiplayer room draw the same board, and the room's path serves its lobby too — one page that
 * is a menu until the game starts. The components themselves are the only things that know, so
 * they are what say so, the same way a game page claims the viewport with `useFullScreen`.
 *
 * One claim slot, no counting. The root layout renders a bare `Slot`, so exactly one page is
 * mounted at a time and React runs every effect cleanup before any new effect — the page handing
 * the claim back and the page taking it always land in the same commit, and both updates batch
 * into one render at the final value. Nothing hears the gap.
 *
 * Must sit inside `AuthProvider`: whether music plays at all is an account setting.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
    const { status, user } = useAuth();
    const [scene, setScene] = useState<MusicScene | null>(null);

    /*
     * Gated on the session rather than on the splash screen. Music needs the stored token read
     * back and `/me` answered before it knows whether it is wanted, which in practice lands well
     * before anybody has tapped their way into a lobby.
     *
     * It also means nothing plays behind the auth gate.
     */
    const enabled = status === 'signedIn' && user?.enableMusic === true;

    useEffect(() => {
        // Keyed on `enabled` as well as the scene, which is what makes the switch on the profile
        // page take effect on the spot rather than at the next navigation.
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

/**
 * Which scene has the soundtrack right now, or `null` where the app is silent.
 *
 * Note this says nothing about whether music is *audible* — a scene stays claimed while the
 * account has music switched off, which is exactly what lets the header offer to switch it
 * back on rather than vanishing the moment it is used.
 */
export function useMusicScene(): MusicScene | null {
    return useContext(MusicSceneContext);
}

/**
 * Play something suitable for `scene` for as long as this component is mounted, and hand the
 * soundtrack back when it goes.
 *
 * Nothing about this is abrupt: a claim fades its loop up from silence, dropping one fades it
 * out, and one claim landing on another crossfades between the two. See `fade.ts`.
 *
 * Which track that is, is not the caller's business — the scene has a handful of loops and one
 * of them is picked per claim, so the same lobby twice running rarely sounds the same. See
 * `music-tracks.ts`.
 */
export function useMusic(scene: MusicScene) {
    const claim = useContext(MusicContext);

    useEffect(() => {
        claim(scene);

        return () => claim(null);
    }, [claim, scene]);
}
