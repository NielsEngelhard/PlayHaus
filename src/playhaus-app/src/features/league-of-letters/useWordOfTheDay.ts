import { getWordOfTheDay, roundOf, startWordOfTheDay, submitDailyGuess, type Game, type GameRound, type WordOfTheDay } from '@/api/calls/league-of-letters';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { useUiLanguage } from '@/features/i18n/LanguageContext';
import { dailyErrorMessage } from '@/features/league-of-letters/game-errors';
import { guessLandedHaptic } from '@/features/league-of-letters/guess-feedback';
import { useCallback, useEffect, useRef, useState } from 'react';

interface WordOfTheDayState {
    today: WordOfTheDay | null
    game: Game | null
    round: GameRound | null
    loading: boolean
    error: TranslationKey | null
    starting: boolean
    reload: () => void
    start: () => Promise<boolean>
    guess: (word: string) => Promise<void>
    gameOver: boolean
}

// Loads today's word and plays the one attempt it comes with.
export function useWordOfTheDay(): WordOfTheDayState {
    const { status } = useAuth();
    const language = useUiLanguage();
    const [today, setToday] = useState<WordOfTheDay | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [starting, setStarting] = useState(false);

    // Nothing may touch state after unmount, and `reload` can fire again while an earlier load is still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const load = useCallback(async () => {
        try {
            const fresh = await getWordOfTheDay(language);
            if (!mounted.current) return;

            setError(null);
            setToday(fresh);
        } catch (failure) {
            if (!mounted.current) return;

            setError(dailyErrorMessage(failure));
        }
    }, [language]);

    // Only a signed-in session has a day of its own.
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: fetching on mount and storing the result is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, load]);

    // Opens today's board. The locale is frozen server-side from here on, so a language switch cannot buy a second go.
    const start = useCallback(async () => {
        setStarting(true);

        try {
            const game = await startWordOfTheDay(language);
            if (!mounted.current) return false;

            setError(null);
            setToday(current => (current === null ? current : { ...current, game, playable: false }));

            return true;
        } catch (failure) {
            if (!mounted.current) return false;

            setError(dailyErrorMessage(failure));

            // The day is already spent, so what is on screen is out of date whichever way it failed.
            void load();

            return false;
        } finally {
            if (mounted.current) setStarting(false);
        }
    }, [language, load]);

    const guess = useCallback(async (word: string) => {
        const result = await submitDailyGuess(word);
        if (!mounted.current) return;

        guessLandedHaptic(result);

        // Applied rather than refetched: the day has one round, and the server just scored the row.
        setToday(current => {
            if (current?.game === undefined) return current;

            const game = current.game;

            return {
                ...current,
                game: {
                    ...game,
                    score: result.score ?? game.score,
                    status: result.gameOver ? 'completed' : game.status,
                    rounds: game.rounds.map(round => ({
                        ...round,
                        guesses: [...round.guesses, result.guess],
                        // Arrives only when the round is over, and its presence is what the board reads as "this one is done".
                        word: result.word ?? round.word
                    }))
                }
            };
        });
    }, []);

    const reload = useCallback(() => {
        if (!signedIn) return;

        // Clearing the error here rather than inside `load` is what puts the loading state back up.
        setError(null);
        void load();
    }, [signedIn, load]);

    const game = today?.game ?? null;
    const visibleError = signedIn ? error : null;

    return {
        today,
        game,
        round: game === null ? null : roundOf(game, 1) ?? null,
        loading: today === null && visibleError === null,
        error: visibleError,
        starting,
        reload,
        start,
        guess,
        gameOver: game?.status === 'completed'
    };
}
