import {
    advanceFFRound,
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
    // The round just decided, which the table stands on until the host moves it.
    reveal: FFReveal | null

    submitting: boolean
    submitAnswer: (roundNumber: number, fills: string[]) => Promise<boolean>
    voting: boolean
    castVote: (roundNumber: number, slot: number) => Promise<boolean>
    /** The host is done with the reveal. Moves the whole table on, or to the result. */
    advance: () => Promise<boolean>
    advancing: boolean

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
    const [advancing, setAdvancing] = useState(false);

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
                        phase: result.phase,
                        status: result.status,
                        rounds: current.rounds.map(round => (
                            result.reveal !== undefined && round.number === result.reveal.roundNumber
                                ? {
                                    ...round,
                                    revealed: true,
                                    options: result.reveal.options,
                                    authors: result.reveal.authors,
                                    voteCount: result.votes
                                }
                                : round
                        ))
                    };
                });
                return;
            }

            case 'round_advanced': {
                // The host left the reveal. Everybody moves on the same frame.
                const moved = event.data;

                setGame(current => current === null ? current : {
                    ...current,
                    players: moved.players,
                    currentRound: moved.currentRound,
                    phase: moved.phase,
                    status: moved.status,
                    rounds: current.rounds.map(round => (
                        moved.nextRound !== undefined && round.number === moved.nextRound.number
                            // Only the options are taken.
                            ? { ...round, options: moved.nextRound.options }
                            : round
                    ))
                });
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
                phase: result.phase,
                status: result.status,
                rounds: current.rounds.map(round => {
                    if (round.number !== roundNumber) return round;

                    const voted = { ...round, myVoteSlot: slot, voteCount: result.votes };

                    return result.reveal === undefined ? voted : {
                        ...voted,
                        revealed: true,
                        options: result.reveal.options,
                        authors: result.reveal.authors
                    };
                })
            });

            return true;
        } catch (failure) {
            if (mounted.current) setActionError(ffPlayErrorMessage(failure));

            return false;
        } finally {
            if (mounted.current) setVoting(false);
        }
    }, [gameId, voting]);

    const at = game?.currentRound;

    // Only the host's call is accepted, so a guest's tap never reaches the table.
    const advance = useCallback(async (): Promise<boolean> => {
        if (gameId === undefined || at === undefined || advancing) return false;

        setAdvancing(true);
        setActionError(null);

        try {
            const result = await advanceFFRound(gameId, at);
            if (!mounted.current) return true;

            // The broadcast says the same thing, and applying it twice is applying it once.
            setGame(current => current === null ? current : {
                ...current,
                players: result.players,
                currentRound: result.currentRound,
                phase: result.phase,
                status: result.status,
                rounds: current.rounds.map(round => (
                    result.nextRound !== undefined && round.number === result.nextRound.number
                        ? { ...round, options: result.nextRound.options }
                        : round
                ))
            });

            return true;
        } catch (failure) {
            if (mounted.current) setActionError(ffPlayErrorMessage(failure));

            return false;
        } finally {
            if (mounted.current) setAdvancing(false);
        }
    }, [gameId, at, advancing]);

    const myRounds = game === null ? [] : game.rounds.filter(round => round.mine);

    // Derived rather than held, so a player who reconnects mid-reveal comes back to it.
    const revealRound = game === null || game.phase !== 'reveal' || game.status !== 'in_progress'
        ? null
        : game.rounds.find(round => round.number === game.currentRound) ?? null;

    const reveal: FFReveal | null = revealRound === null ? null : {
        roundNumber: revealRound.number,
        line: revealRound.line,
        authors: revealRound.authors ?? [],
        options: revealRound.options ?? []
    };

    const votingRound = game === null || game.phase !== 'voting'
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
        advance,
        advancing,
        // Read off the status rather than off the round number.
        gameOver: game !== null && game.status !== 'in_progress',
        reload: load
    };
}
