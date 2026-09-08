import {
    getSingleDeviceOneOfUsGame,
    voteOutPlayerSingleDeviceOneOfUsGame,
    type OneOfUsSingleDeviceGame,
    type VoteOutResult
} from "@/api/calls/one-of-us-single-device";
import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { oneOfUsErrorMessage } from "@/features/one-of-us/game-errors";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PlayableOneOfUsGame {
    game: OneOfUsSingleDeviceGame | null
    status: 'loading' | 'ready' | 'failed'
    /** Why nothing is on screen at all. */
    error: TranslationKey | null
    /** A vote is in the air. */
    voting: boolean
    /** A vote the server refused, with the board still up behind it. */
    voteError: TranslationKey | null
    // Votes somebody out and hands back what the server said, or null if it refused.
    voteOut: (playerId: string) => Promise<VoteOutResult | null>
    reload: () => void
}

// One game of One of Us, played off one phone.
export function useSingleDeviceOneOfUsGame(gameId: string): PlayableOneOfUsGame {
    const { status: auth } = useAuth();

    const [game, setGame] = useState<OneOfUsSingleDeviceGame | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [voting, setVoting] = useState(false);
    const [voteError, setVoteError] = useState<TranslationKey | null>(null);
    const [attempt, setAttempt] = useState(0);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Only a signed-in session may ask for this one: the endpoint is behind auth.
    const signedIn = auth === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        let current = true;

        void (async () => {
            try {
                const loaded = await getSingleDeviceOneOfUsGame(gameId);
                if (!current || !mounted.current) return;

                setGame(loaded);
                setError(loaded === null ? 'oneOfUs.errors.gameGone' : null);
            } catch (failure) {
                if (!current || !mounted.current) return;

                setError(oneOfUsErrorMessage(failure));
            }
        })();

        // Nothing to abort — `request` has no signal — so dropping the answer is the whole of the tidy-up.
        return () => { current = false; };
    }, [gameId, attempt, signedIn]);

    const voteOut = useCallback(async (playerId: string): Promise<VoteOutResult | null> => {
        if (voting || game === null) return null;

        setVoting(true);
        setVoteError(null);

        try {
            const result = await voteOutPlayerSingleDeviceOneOfUsGame(playerId, game.id);
            if (!mounted.current) return null;

            if (result === null) {
                setVoteError('oneOfUs.errors.generic');
                return null;
            }

            // Marked here rather than refetched.
            setGame(current => current === null ? current : {
                ...current,
                finishedAt: result.gameEnded ? new Date().toISOString() : current.finishedAt,
                civiliansWon: result.gameEnded ? result.civiliansWon : current.civiliansWon,
                players: current.players.map(player => ({
                    ...player,
                    isVotedOut: player.isVotedOut || player.playerId === result.playerId,
                    isMayor: player.playerId === result.mayorPlayerId
                }))
            });

            return result;
        } catch (failure) {
            if (!mounted.current) return null;

            setVoteError(oneOfUsErrorMessage(failure));
            return null;
        } finally {
            if (mounted.current) setVoting(false);
        }
    }, [voting, game]);

    const reload = useCallback(() => {
        setError(null);
        setAttempt(attempt => attempt + 1);
    }, []);

    const status = game !== null ? 'ready' : error !== null ? 'failed' : 'loading';

    return { game, status, error, voting, voteError, voteOut, reload };
}
