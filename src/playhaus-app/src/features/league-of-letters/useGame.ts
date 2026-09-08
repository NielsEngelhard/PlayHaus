import { getGame, roundOf, submitGuess, type Game, type GameRound } from '@/api/calls/league-of-letters';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { gameErrorMessage } from '@/features/league-of-letters/game-errors';
import { guessLandedHaptic } from '@/features/league-of-letters/guess-feedback';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GameState {
    game: Game | null
    round: GameRound | null
    loading: boolean
    error: TranslationKey | null
    reload: () => void
    guess: (word: string) => Promise<void>
    roundOver: boolean
    gameOver: boolean
    nextRound: () => void
}

// Loads one game and plays it.
export function useGame(gameId: string | undefined): GameState {
    const { user, status } = useAuth();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    // Which round the board is showing.
    const [viewing, setViewing] = useState(1);

    // Nothing may touch state after unmount, and `reload` can fire again while an earlier load is still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Every state change happens after the `await`, never on the way in.
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

    // Only a signed-in session can read a game.
    const signedIn = status === 'signedIn';
    const userId = user?.id ?? null;

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: fetching on mount and storing the result is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, userId, load]);

    const guess = useCallback(async (word: string) => {
        if (!gameId) return;

        const result = await submitGuess(gameId, word);
        if (!mounted.current) return;

        guessLandedHaptic(result);

        // Applied rather than refetched.
        setGame(current => {
            if (current === null || current.id !== gameId) return current;

            // The guess was played against whichever round the game was on when it was sent.
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
                        // Arrives only when the round is over, and its presence is what the board reads as "this one is done".
                        word: result.word ?? round.word
                    }
                    : round)
            };
        });
    }, [gameId]);

    const reload = useCallback(() => {
        if (!signedIn) return;

        // Clearing the error here rather than inside `load` is what puts the loading state back up.
        setError(null);
        void load();
    }, [signedIn, load]);

    // What was fetched is only this game if it is the one that was asked for.
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
