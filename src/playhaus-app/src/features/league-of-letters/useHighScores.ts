import { getHighScores, type HighScore } from '@/api/calls/league-of-letters';
import { useAuth } from '@/features/auth/useAuth';
import { useEffect, useRef, useState } from 'react';

// The account's competitive bests, one per word length. Empty until they arrive, so nothing flashes.
export function useHighScores(): HighScore[] {
    const { status } = useAuth();
    const [scores, setScores] = useState<HighScore[]>([]);

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        void (async () => {
            try {
                const fresh = await getHighScores();
                if (mounted.current) setScores(fresh);
            } catch {
                // A tag that never appears is a better failure than an error on the index page.
            }
        })();
    }, [signedIn]);

    return scores;
}

// The highest of them, across every word length, or null while there is nothing to show.
export function bestOf(scores: HighScore[]): HighScore | null {
    return scores.reduce<HighScore | null>(
        (best, score) => best === null || score.score > best.score ? score : best,
        null
    );
}
