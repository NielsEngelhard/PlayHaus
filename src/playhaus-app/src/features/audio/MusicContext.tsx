import { playMusic, stopMusic, type MusicTrack } from "@/features/audio/music-player";
import { useAuth } from "@/features/auth/useAuth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * What the app sounds like when nobody has asked for anything else. Every menu, list and
 * settings page shares one calm loop, so moving around the app is continuous rather than a
 * series of tracks starting and stopping.
 */
const DEFAULT_TRACK: MusicTrack = 'zen';

/**
 * Claims the soundtrack for as long as the claiming component is mounted, or hands it back
 * with `null`. Stable across renders — it is `useState`'s own setter.
 */
const MusicContext = createContext<(track: MusicTrack | null) => void>(() => { });

/**
 * Decides which loop is playing, for the whole app.
 *
 * A claim rather than a table of routes, because "the board" is not a route: the solo game
 * and the multiplayer room draw the same board, and the room's path serves the lobby too —
 * one page that is a menu until the game starts. The board itself is the only thing that
 * knows, so the board is what says so, the same way a game page claims the viewport with
 * `useFullScreen`.
 *
 * One claim slot, no counting. The root layout renders a bare `Slot`, so exactly one page
 * is mounted at a time and React runs every effect cleanup before any new effect — the
 * page handing the claim back and the page taking it always land in the same commit, and
 * both updates batch into one render at the final value. Nothing hears the gap.
 *
 * Must sit inside `AuthProvider`: whether music plays at all is an account setting.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
    const { status, user } = useAuth();
    const [claimed, setClaimed] = useState<MusicTrack | null>(null);

    /*
     * Gated on the session rather than on the splash screen. Music needs the stored token
     * read back and `/me` answered before it knows whether it is wanted, which in practice
     * lands well after the fonts and the theme have settled — so there is nothing to hold
     * it back from, and no reason for the audio feature to know `SplashScreen` exists.
     *
     * It also means nothing plays behind the auth gate, and that a guest's music starts the
     * moment they tap through it: after a real gesture.
     */
    const enabled = status === 'signedIn' && user?.enableMusic === true;

    const track = claimed ?? DEFAULT_TRACK;

    useEffect(() => {
        // Keyed on `enabled` as well as the track, which is what makes the switch on the
        // profile page take effect where you flipped it rather than at the next navigation.
        if (!enabled) {
            stopMusic();

            return;
        }

        playMusic(track);
    }, [enabled, track]);

    return (
        <MusicContext.Provider value={setClaimed}>
            {children}
        </MusicContext.Provider>
    )
}

/**
 * Play `track` instead of the app's default loop for as long as this component is mounted.
 *
 * Called by the board, not by a screen: both the solo page and the multiplayer room render
 * the same board, and putting the claim in it covers both — and covers the room's lobby
 * being a menu on the same path as a game.
 */
export function useGameMusic(track: MusicTrack) {
    const claim = useContext(MusicContext);

    useEffect(() => {
        claim(track);

        return () => claim(null);
    }, [claim, track]);
}
