import { getGame, roundOf, submitGuess, type Game, type GameRound } from '@/api/calls/league-of-letters';
import { useAuth } from '@/features/auth/useAuth';
import { gameErrorMessage } from '@/features/league-of-letters/game-errors';
import { guessLandedHaptic } from '@/features/league-of-letters/guess-feedback';
import type { TranslationKey } from '@/features/i18n/keys';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GameState {
    game: Game | null
    /** The round on screen. Not always the one the server is on — see `viewing` below. */
    round: GameRound | null
    /** True until the first load settles, one way or the other. */
    loading: boolean
    /** The initial load failed. There is no board to show, so the page offers a retry. */
    error: TranslationKey | null
    reload: () => void
    /**
     * Sends a guess and folds the result into the game in hand.
     *
     * Rejects rather than storing the failure: whether a refused guess is worth
     * interrupting the player over is the board's call, not this hook's, and the
     * board is the thing that knows a word is still sitting in the current row.
     */
    guess: (word: string) => Promise<void>
    /** The viewed round is finished — solved, or out of guesses. */
    roundOver: boolean
    /** Every round is done. */
    gameOver: boolean
    /** Moves on from a finished round to the one the server is now on. */
    nextRound: () => void
}

/**
 * Loads one game and plays it.
 *
 * There is no polling. Solo is the only mode this drives, and a solo game only
 * ever changes because its one player did something — so the answer to a guess is
 * already the newest state there is, and a timer asking the server again would
 * find nothing new every time.
 */
export function useGame(gameId: string | undefined): GameState {
    const { user, status } = useAuth();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    /**
     * Which round the board is showing.
     *
     * It lags `game.currentRound` on purpose. Ending a round advances the server
     * immediately, but the player has not seen the verdict yet — swapping the
     * board to a fresh puzzle at that moment would take the answer away in the
     * same frame it was revealed. `nextRound` is what catches it up.
     */
    const [viewing, setViewing] = useState(1);

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
            // A game picked up again opens on the round it left off at.
            setViewing(fresh.currentRound);
        } catch (failure) {
            if (!mounted.current) return;

            setError(gameErrorMessage(failure));
        }
    }, [gameId]);

    // Only a signed-in session can read a game: the API answers 404 for a game you
    // do not own, and while signed out the auth gate is standing over this page
    // anyway.
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

        const result = await submitGuess(gameId, word);
        if (!mounted.current) return;

        guessLandedHaptic(result);

        // Applied rather than refetched. The response carries the guess and the
        // little around it that moved, and the rest of the game is already here —
        // asking for all of it again would send back what we just sent up.
        setGame(current => {
            if (current === null || current.id !== gameId) return current;

            // The guess was played against whichever round the game was on when it
            // was sent, which is the one it has not advanced past yet.
            const played = current.currentRound;

            return {
                ...current,
                currentRound: result.currentRound,
                score: result.score ?? current.score,
                status: result.gameOver ? 'completed' : current.status,
                rounds: current.rounds.map(round => round.roundNumber === played
                    ? {
                        ...round,
                        guesses: [...round.guesses, result.guess],
                        // Arrives only when the round is over, and its presence is
                        // what the board reads as "this one is done".
                        word: result.word ?? round.word
                    }
                    : round)
            };
        });
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
    const round = current === null ? null : roundOf(current, viewing) ?? null;

    const nextRound = useCallback(() => {
        setViewing(showing => (game === null ? showing : game.currentRound));
    }, [game]);

    return {
        game: current,
        round,
        loading: current === null && visibleError === null,
        error: visibleError,
        reload,
        guess,
        roundOver: round?.word !== undefined,
        gameOver: current?.status === 'completed',
        nextRound
    };
}
