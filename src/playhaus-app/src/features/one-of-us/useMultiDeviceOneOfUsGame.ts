import {
    castOOUVote,
    continueOOURound,
    getOOUGame,
    submitOOUAnswer,
    type OOUGame,
    type OOUReveal,
    type OOURound
} from '@/api/calls/one-of-us-multi-device';
import { oouRoom, type OOUServerEvent } from '@/api/oou-socket';
import type { SocketStatus } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import { oneOfUsErrorMessage, oneOfUsPlayErrorMessage } from '@/features/one-of-us/game-errors';
import type { TranslationKey } from '@/features/i18n/keys';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

// The multi-device One of Us board: one prompt for the whole game, a new answer every round.

export interface OOUGameState {
    game: OOUGame | null
    online: Set<string>
    connection: SocketStatus
    loading: boolean
    error: TranslationKey | null
    /** An answer, a vote or a tap was refused. The board stays up; this says why. */
    actionError: TranslationKey | null

    /** The one beat before the game proper: your prompt, once, because roles are dealt once. */
    dealing: boolean
    dismissDeal: () => void

    /** Voted out. Still at the table, still watching, but no longer allowed to act. */
    amOut: boolean
    /** The round being played, whatever phase it is in. */
    round: OOURound | null
    /** This player may write an answer right now. */
    answering: boolean
    /** The round this player may vote on, or null. */
    votingRound: OOURound | null
    // The round just decided, while this player is still reading it.
    reveal: OOUReveal | null

    submitting: boolean
    submitAnswer: (roundNumber: number, text: string) => Promise<boolean>
    voting: boolean
    castVote: (roundNumber: number, slot: number) => Promise<boolean>
    continuing: boolean
    /** Done reading the reveal. Everybody taps; only the first tap opens the round. */
    continueRound: () => Promise<void>

    /** The game reached its win condition. */
    gameOver: boolean
    reload: () => void
}

export function useMultiDeviceOneOfUsGame(gameId: string | undefined, code: string): OOUGameState {
    const { status, user } = useAuth();

    const [game, setGame] = useState<OOUGame | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [actionError, setActionError] = useState<TranslationKey | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [voting, setVoting] = useState(false);
    const [continuing, setContinuing] = useState(false);
    const [reveal, setReveal] = useState<OOUReveal | null>(null);

    // One beat for the whole game rather than one per round: nobody is dealt a second role.
    const [dealing, setDealing] = useState(true);

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    const load = useCallback(async () => {
        if (!signedIn || gameId === undefined) return;

        try {
            const fresh = await getOOUGame(gameId);
            if (!mounted.current) return;

            setError(null);
            setGame(fresh);
        } catch (failure) {
            if (!mounted.current) return;

            setError(oneOfUsErrorMessage(failure));
        }
    }, [signedIn, gameId]);

    useEffect(() => {
        if (!signedIn || gameId === undefined) return;

        // set-state-in-effect: reading the board on mount and storing it is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, gameId, load]);

    // A different game under the same hook, which is what playing again is: a fresh deal.
    const [showing, setShowing] = useState(gameId);
    if (showing !== gameId) {
        setShowing(gameId);
        setDealing(true);
        setReveal(null);
        setGame(null);
        setError(null);
        setActionError(null);
    }

    const onEvent = useCallback((event: OOUServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state': {
                // The entire reconnect story.
                if (event.data.game !== undefined) setGame(event.data.game);
                return;
            }

            case 'answer_progress': {
                // Counts only, never who wrote nor what they wrote.
                const { roundNumber, answersIn, answersNeeded } = event.data;

                setGame(current => (
                    current === null || current.round === undefined || current.round.number !== roundNumber
                        ? current
                        : { ...current, round: { ...current.round, answersIn, answersNeeded } }
                ));
                return;
            }

            case 'voting_started': {
                // Carries no answers, deliberately: this player's own answer and vote are part of the board.
                void load();
                return;
            }

            case 'vote_progress': {
                const { roundNumber, votesIn, votesNeeded } = event.data;

                setGame(current => (
                    current === null || current.round === undefined || current.round.number !== roundNumber
                        ? current
                        : { ...current, round: { ...current.round, votesIn, votesNeeded } }
                ));
                return;
            }

            case 'round_result': {
                // Everything the table needs is in this one frame, and all of it is public by now.
                const result = event.data;

                setGame(current => {
                    if (current === null) return current;

                    const closed = current.round === undefined || result.reveal === undefined
                        ? current.round
                        : {
                            ...current.round,
                            revealed: true,
                            votesIn: result.votesIn,
                            answers: result.reveal.answers,
                            votedOut: result.reveal.votedOut
                        };

                    return {
                        ...current,
                        players: result.players,
                        phase: result.phase,
                        status: result.status,
                        civiliansWon: result.civiliansWon,
                        mayorId: result.mayorId,
                        // Once out, always out -- the roster is the only place a player learns they went.
                        amOut: current.amOut || result.players.some(player => player.userId === userId && player.isVotedOut),
                        round: closed
                    };
                });

                if (result.reveal !== undefined) setReveal(result.reveal);
                return;
            }

            case 'round_opened': {
                // The round itself is per-reader — a fresh answer box, a cleared vote — so the board is re-read.
                void load();
                return;
            }

            case 'game_over': {
                const { players, civiliansWon } = event.data;

                setGame(current => (
                    current === null ? current : { ...current, players, civiliansWon, status: 'completed' }
                ));

                // The frame carries no words, and a finished game is the one moment the pair is public.
                void load();
                return;
            }

            default:
                // The room's own frames, which the lobby hook is reading off this same socket.
                return;
        }
    }, [load, userId]);

    // Not before there is a game.
    const { status: connection, online } = useRoomSocket<OOUServerEvent>({
        room: gameId === undefined ? undefined : oouRoom(code),
        enabled: signedIn,
        onEvent
    });

    // Writes this player's answer for the round.
    const submitAnswer = useCallback(async (roundNumber: number, text: string): Promise<boolean> => {
        if (gameId === undefined || submitting) return false;

        setSubmitting(true);
        setActionError(null);

        try {
            const result = await submitOOUAnswer(gameId, roundNumber, text);
            if (!mounted.current) return true;

            setGame(current => current === null ? current : {
                ...current,
                myAnswer: text,
                round: current.round === undefined || current.round.number !== roundNumber
                    ? current.round
                    : {
                        ...current.round,
                        answersIn: result.answersIn,
                        answersNeeded: result.answersNeeded
                    }
            });

            // Voting opened on the back of this very request, and the answers are only readable through the board.
            if (result.votingOpened) void load();

            return true;
        } catch (failure) {
            if (mounted.current) setActionError(oneOfUsPlayErrorMessage(failure));

            return false;
        } finally {
            if (mounted.current) setSubmitting(false);
        }
    }, [gameId, submitting, load]);

    // Picks one of the anonymous answers.
    const castVote = useCallback(async (roundNumber: number, slot: number): Promise<boolean> => {
        if (gameId === undefined || voting) return false;

        setVoting(true);
        setActionError(null);

        try {
            const result = await castOOUVote(gameId, roundNumber, slot);
            if (!mounted.current) return true;

            setGame(current => {
                if (current === null) return current;

                const voted = current.round === undefined || current.round.number !== roundNumber
                    ? current.round
                    : {
                        ...current.round,
                        votesIn: result.votesIn,
                        votesNeeded: result.votesNeeded,
                        ...(result.reveal === undefined ? {} : {
                            revealed: true,
                            answers: result.reveal.answers,
                            votedOut: result.reveal.votedOut
                        })
                    };

                return {
                    ...current,
                    myVoteSlot: slot,
                    players: result.players,
                    amOut: current.amOut || result.players.some(player => player.userId === userId && player.isVotedOut),
                    phase: result.phase,
                    status: result.status,
                    civiliansWon: result.civiliansWon,
                    mayorId: result.mayorId,
                    round: voted
                };
            });

            if (result.reveal !== undefined) setReveal(result.reveal);

            // The closing vote's own response carries no words either.
            if (result.status !== 'in_progress') void load();

            return true;
        } catch (failure) {
            if (mounted.current) setActionError(oneOfUsPlayErrorMessage(failure));

            return false;
        } finally {
            if (mounted.current) setVoting(false);
        }
    }, [gameId, voting, userId, load]);

    // Stable across renders: the deal screen hangs its action off this.
    const dismissDeal = useCallback(() => setDealing(false), []);
    const dismissReveal = useCallback(() => setReveal(null), []);

    const continueRound = useCallback(async () => {
        if (gameId === undefined || continuing || reveal === null) return;

        setContinuing(true);
        setActionError(null);

        try {
            await continueOOURound(gameId, reveal.roundNumber);
            if (!mounted.current) return;

            dismissReveal();
            void load();
        } catch (failure) {
            if (mounted.current) setActionError(oneOfUsPlayErrorMessage(failure));
        } finally {
            if (mounted.current) setContinuing(false);
        }
    }, [gameId, continuing, reveal, dismissReveal, load]);

    const amOut = game?.amOut ?? false;
    const round = game?.round ?? null;

    // Written so exactly one screen can be live: a reveal being read holds the board on the round just decided.
    const live = game !== null && game.status === 'in_progress' && reveal === null && !dealing;

    return {
        game,
        online,
        connection,
        loading: game === null && error === null,
        error,
        actionError,
        dealing: game !== null && dealing,
        dismissDeal,
        amOut,
        round,
        answering: live && game.phase === 'answer' && !amOut,
        votingRound: live && game.phase === 'vote' && !amOut ? round : null,
        reveal,
        submitting,
        submitAnswer,
        voting,
        castVote,
        continuing,
        continueRound,
        // Read off the status rather than off the round number: there is no round total.
        gameOver: game !== null && game.status !== 'in_progress',
        reload: load
    };
}
