import {
    castFFVote,
    getFFGame,
    submitFFAnswer,
    type FFGame,
    type FFReveal,
    type FFRound
} from '@/api/calls/fake-filler';
import { ffRoom, type FFServerEvent } from '@/api/ff-socket';
import type { SocketStatus } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import { ffErrorMessage, ffPlayErrorMessage } from '@/features/fake-filler/fake-filler-errors';
import type { TranslationKey } from '@/features/i18n/keys';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

// The Fake Filler board.

export interface FFGameState {
    game: FFGame | null
    online: Set<string>
    connection: SocketStatus
    loading: boolean
    error: TranslationKey | null
    /** A submit or a vote was refused. The board stays up; this says why. */
    actionError: TranslationKey | null

    /** The two prompts dealt to this player to write for. */
    myRounds: FFRound[]
    // The round the table is voting on, or null.
    votingRound: FFRound | null
    // The round just decided, while this player is still reading it.
    reveal: FFReveal | null

    submitting: boolean
    submitAnswer: (roundNumber: number, fills: string[]) => Promise<boolean>
    voting: boolean
    castVote: (roundNumber: number, slot: number) => Promise<boolean>
    /** Done reading the reveal. Moves on to the next round, or to the result. */
    dismissReveal: () => void

    /** The last round has been read and the game is over. */
    gameOver: boolean
    reload: () => void
}

export function useGame(gameId: string | undefined, code: string): FFGameState {
    const { status } = useAuth();

    const [game, setGame] = useState<FFGame | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [actionError, setActionError] = useState<TranslationKey | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [voting, setVoting] = useState(false);
    const [reveal, setReveal] = useState<FFReveal | null>(null);

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const signedIn = status === 'signedIn';

    const load = useCallback(async () => {
        if (!signedIn || gameId === undefined) return;

        try {
            const fresh = await getFFGame(gameId);
            if (!mounted.current) return;

            setError(null);
            setGame(fresh);
        } catch (failure) {
            if (!mounted.current) return;

            setError(ffErrorMessage(failure));
        }
    }, [signedIn, gameId]);

    useEffect(() => {
        if (!signedIn || gameId === undefined) return;

        // set-state-in-effect: reading the board on mount and storing it is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, gameId, load]);

    // A different game under the same hook, which is what playing again is.
    const [showing, setShowing] = useState(gameId);
    if (showing !== gameId) {
        setShowing(gameId);
        setReveal(null);
        setGame(null);
        setError(null);
        setActionError(null);
    }

    const onEvent = useCallback((event: FFServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state': {
                // The entire reconnect story.
                if (event.data.game !== undefined) setGame(event.data.game);
                return;
            }

            case 'answer_progress': {
                // Counts only, never content.
                const { answersIn, answersNeeded } = event.data;

                setGame(current => (
                    current === null ? current : { ...current, answersIn, answersNeeded }
                ));
                return;
            }

            case 'voting_started': {
                // Carries no board, deliberately: which options a player may vote on depends on which prompts were dealt to them.
                void load();
                return;
            }

            case 'vote_progress': {
                const { roundNumber, votes } = event.data;

                setGame(current => current === null ? current : {
                    ...current,
                    rounds: current.rounds.map(round => (
                        round.number === roundNumber ? { ...round, voteCount: votes } : round
                    ))
                });
                return;
            }

            case 'round_result': {
                // Everything the table needs is in this one frame.
                const result = event.data;

                setGame(current => {
                    if (current === null) return current;

                    return {
                        ...current,
                        players: result.players,
                        currentRound: result.currentRound,
                        status: result.status,
                        rounds: current.rounds.map(round => {
                            if (result.reveal !== undefined && round.number === result.reveal.roundNumber) {
                                return {
                                    ...round,
                                    revealed: true,
                                    options: result.reveal.options,
                                    authors: result.reveal.authors,
                                    voteCount: result.votes
                                };
                            }

                            if (result.nextRound !== undefined && round.number === result.nextRound.number) {
                                // Only the options are taken.
                                return { ...round, options: result.nextRound.options };
                            }

                            return round;
                        })
                    };
                });

                if (result.reveal !== undefined) setReveal(result.reveal);
                return;
            }

            case 'game_over': {
                const { players } = event.data;

                setGame(current => (
                    current === null ? current : { ...current, players, status: 'completed' }
                ));
                return;
            }

            default:
                // The lobby's own frames, which `useLobby` is reading off this same room.
                return;
        }
    }, [load]);

    // Not before there is a game.
    const { status: connection, online } = useRoomSocket<FFServerEvent>({
        room: gameId === undefined ? undefined : ffRoom(code),
        enabled: signedIn,
        onEvent
    });

    // Fills in one of this player's prompts.
    const submitAnswer = useCallback(async (roundNumber: number, fills: string[]): Promise<boolean> => {
        if (gameId === undefined || submitting) return false;

        setSubmitting(true);
        setActionError(null);

        try {
            const result = await submitFFAnswer(gameId, roundNumber, fills);
            if (!mounted.current) return true;

            setGame(current => current === null ? current : {
                ...current,
                answersIn: result.answersIn,
                answersNeeded: result.answersNeeded,
                rounds: current.rounds.map(round => (
                    round.number === roundNumber
                        ? { ...round, answered: true, myFills: fills, answerCount: round.answerCount + 1 }
                        : round
                ))
            });

            // Voting opened on the back of this very request.
            if (result.votingOpened) void load();

            return true;
        } catch (failure) {
            if (mounted.current) setActionError(ffPlayErrorMessage(failure));

            return false;
        } finally {
            if (mounted.current) setSubmitting(false);
        }
    }, [gameId, submitting, load]);

    // Picks an option on the round being voted on.
    const castVote = useCallback(async (roundNumber: number, slot: number): Promise<boolean> => {
        if (gameId === undefined || voting) return false;

        setVoting(true);
        setActionError(null);

        try {
            const result = await castFFVote(gameId, roundNumber, slot);
            if (!mounted.current) return true;

            setGame(current => current === null ? current : {
                ...current,
                players: result.players,
                currentRound: result.currentRound,
                status: result.status,
                rounds: current.rounds.map(round => {
                    if (round.number === roundNumber) {
                        const voted = { ...round, myVoteSlot: slot, voteCount: result.votes };

                        return result.reveal === undefined ? voted : {
                            ...voted,
                            revealed: true,
                            options: result.reveal.options,
                            authors: result.reveal.authors
                        };
                    }

                    if (result.nextRound !== undefined && round.number === result.nextRound.number) {
                        return { ...round, options: result.nextRound.options };
                    }

                    return round;
                })
            });

            if (result.reveal !== undefined) setReveal(result.reveal);

            return true;
        } catch (failure) {
            if (mounted.current) setActionError(ffPlayErrorMessage(failure));

            return false;
        } finally {
            if (mounted.current) setVoting(false);
        }
    }, [gameId, voting]);

    // Stable across renders: the reveal screen hangs its action off this.
    const dismissReveal = useCallback(() => setReveal(null), []);

    const myRounds = game === null ? [] : game.rounds.filter(round => round.mine);

    // Null while a reveal is up, which is what holds the board on the round just decided rather than the one the server has already moved to.
    const votingRound = game === null || game.phase !== 'voting' || reveal !== null
        ? null
        : game.rounds.find(round => round.number === game.currentRound) ?? null;

    return {
        game,
        online,
        connection,
        loading: game === null && error === null,
        error,
        actionError,
        myRounds,
        votingRound,
        reveal,
        submitting,
        submitAnswer,
        voting,
        castVote,
        dismissReveal,
        // Read off the status rather than off the round number.
        gameOver: game !== null && game.status !== 'in_progress',
        reload: load
    };
}
