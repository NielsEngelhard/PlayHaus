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
    /**
     * Votes somebody out and hands back what the server said, or null if it refused.
     *
     * Awaited by the screen rather than fired and forgotten, because the result is the
     * next screen: it carries the role of whoever just left, which is the one thing the
     * table is waiting to be told.
     */
    voteOut: (playerId: string) => Promise<VoteOutResult | null>
    reload: () => void
}

/**
 * One game of One of Us, played off one phone.
 *
 * Built the same way `useQuizSession` is, and for the same reason: the server owns the
 * game and every write replaces what is held here with the server's own answer rather
 * than being patched in locally. The previous version of this hook filtered the voted-out
 * player out of its own state and never fetched anything at all, so the screen and the
 * database were guessing at each other from the first vote.
 *
 * There is no polling and no socket. One phone is playing this, and it is the only thing
 * that can change the game.
 */
export function useSingleDeviceOneOfUsGame(gameId: string): PlayableOneOfUsGame {
    const { status: auth } = useAuth();

    const [game, setGame] = useState<OneOfUsSingleDeviceGame | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [voting, setVoting] = useState(false);
    const [voteError, setVoteError] = useState<TranslationKey | null>(null);
    const [attempt, setAttempt] = useState(0);

    // Nothing may touch state after unmount — the way off this screen is the close
    // button, which can be pressed with a vote still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /*
     * Only a signed-in session may ask for this one: the endpoint is behind auth.
     *
     * Restoring is not signed in yet, and asking in that state answers 401 — which this
     * screen would read as an expired session and say so, to somebody whose session is
     * perfectly good. Waiting means the game loads itself the moment there is somebody
     * to load it for. It matters more here than anywhere: this screen is the one a
     * deep link lands on, so it routinely renders before auth has finished restoring.
     */
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

        // Nothing to abort — `request` has no signal — so dropping the answer is the
        // whole of the tidy-up.
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

            // Marked here rather than refetched. The vote endpoint answers with what
            // changed and nothing else about the game moves, so this is the server's
            // own answer applied — not a guess at one. `finishedAt` is set for the same
            // reason: it is what a reload would find, so the resumed game agrees with
            // the screen that is already up.
            //
            // The mayor is taken from the answer for the same reason and not carried
            // over: the vote may have been for the mayor themselves, and the server has
            // already handed the chain on by the time this runs. Applying it to every
            // seat rather than only to the new mayor is what takes it off the old one.
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
