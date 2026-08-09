import { getGame, submitGuess, type Game } from '@/api/calls/league-of-letters';
import { useAuth } from '@/features/auth/useAuth';
import { gameErrorMessage } from '@/features/league-of-letters/game-errors';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GameState {
    game: Game | null
    /** True until the first load settles, one way or the other. */
    loading: boolean
    /** The initial load failed. There is no board to show, so the page offers a retry. */
    error: string | null
    reload: () => void
    /**
     * Sends a guess and swaps in the game the server answers with.
     *
     * Rejects rather than storing the failure: whether a refused guess is worth
     * interrupting the player over is the board's call, not this hook's, and the
     * board is the thing that knows a word is still sitting in the current row.
     */
    guess: (word: string) => Promise<void>
}

/**
 * Loads one game and plays it.
 *
 * There is no polling. Solo is the only mode this drives today, and a solo game
 * only ever changes because its one player did something — so the response to a
 * guess is already the newest state there is, and a timer asking the server for
 * it again would find nothing new every time.
 *
 * A shared game is the opposite and will need one: `Game.version` exists for
 * exactly that, so a room screen can poll with the version it last saw.
 */
export function useGame(gameId: string | undefined): GameState {
    const { user, status } = useAuth();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Nothing may touch state after unmount, and `reload` can fire again while an
    // earlier load is still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * Every state change happens after the `await`, never on the way in — the
     * effect below calls this during render's commit, and a `setState` before the
     * first suspension point would be a synchronous cascading render.
     */
    const load = useCallback(async () => {
        if (!gameId) return;

        try {
            const fresh = await getGame(gameId);
            if (!mounted.current) return;

            setError(null);
            setGame(fresh);
        } catch (failure) {
            if (!mounted.current) return;

            setError(gameErrorMessage(failure));
        }
    }, [gameId]);

    // Only a signed-in session can read a game: the API answers 404 for a game you
    // are not a player in, and while signed out the auth gate is standing over this
    // page anyway.
    const signedIn = status === 'signedIn';
    const userId = user?.id ?? null;

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: fetching on mount and storing the result is the whole
        // job, and there is no query library here to hand it to. State is only
        // written after the request resolves, so nothing cascades in the render this
        // effect belongs to. `useProfile` loads the same way.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, userId, load]);

    const guess = useCallback(async (word: string) => {
        if (!gameId) return;

        // The response is the whole game after the guess — status, scores, and the
        // answer if it has just been revealed — so there is nothing left to re-read.
        const updated = await submitGuess(gameId, word);
        if (!mounted.current) return;

        setGame(updated);
    }, [gameId]);

    const reload = useCallback(() => {
        if (!signedIn) return;

        // Clearing the error here rather than inside `load` is what puts the loading
        // state back up, so a retry visibly does something. Safe from an event
        // handler, which is not what the effect rule is about.
        setError(null);
        void load();
    }, [signedIn, load]);

    // What was fetched is only this game if it is the one that was asked for —
    // otherwise the previous game would flash on screen while the new one loads.
    const current = game?.id === gameId ? game : null;
    const visibleError = signedIn ? error : null;

    return {
        game: current,
        loading: current === null && visibleError === null,
        error: visibleError,
        reload,
        guess
    };
}
