import {
    getMultiplayerGame,
    roundOf,
    submitMultiplayerGuess,
    type Game,
    type GameRound,
    type MultiplayerGuessResult
} from '@/api/calls/league-of-letters';
import { lolRoom, type ServerEvent } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import { gameErrorMessage } from '@/features/league-of-letters/game-errors';
import { guessLandedHaptic } from '@/features/league-of-letters/guess-feedback';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface MultiplayerGameState {
    game: Game | null
    /** Who is connected right now. What the scoreboard's live dots are drawn from. */
    online: Set<string>
    /** The round on screen. Lags `game.currentRound` while a verdict is being read. */
    round: GameRound | null
    loading: boolean
    error: string | null
    /** It is this player's turn: the keyboard is live and a guess will be taken. */
    myTurn: boolean
    /**
     * What the player whose turn it is has typed so far, or null when nobody is
     * mid-word. Never your own letters — you already have those on screen.
     */
    typing: string | null
    reload: () => void
    guess: (word: string) => Promise<void>
    /** Relays a draft to the rest of the table. Throttled; safe to call per keystroke. */
    onTyping: (letters: string) => void
    roundOver: boolean
    gameOver: boolean
    nextRound: () => void
}

/**
 * How often a draft goes out at most.
 *
 * Fast typing is around ten keystrokes a second and every one of them is a frame to
 * five other people, so this is the difference between a socket that carries a word
 * and one that carries a keyboard. Short enough that the letters still appear as
 * they are typed rather than in clumps.
 */
const TYPING_THROTTLE_MS = 80;

/**
 * Plays one multiplayer game.
 *
 * The shape of `useGame`, with the difference that a solo game only ever changes
 * because its one player changed it, and this one changes constantly because of
 * other people. So where `useGame` has nothing to listen to, this folds in the
 * events the room's socket delivers — and the fold is the same code either way,
 * because a guess of your own and a guess of somebody else's arrive in exactly the
 * same shape.
 *
 * Holds its own connection to the room, keyed by the join code — the same room the
 * lobby is on. That is a second connection from one device while both screens are
 * mounted, which costs nothing that matters: presence counts players rather than
 * connections, so the two are one light, and the alternative is threading every
 * frame down through a lobby that has no business knowing what a board is.
 */
export function useMultiplayerGame(gameId: string | undefined, code: string): MultiplayerGameState {
    const { user, status } = useAuth();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [typing, setTyping] = useState<string | null>(null);

    /**
     * Which round the board is showing.
     *
     * Lags `game.currentRound` on purpose, exactly as in solo: a round that has just
     * ended stays up until the player moves off it, so the verdict is not swapped out
     * from under them by the next puzzle.
     */
    const [viewing, setViewing] = useState(1);

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    const load = useCallback(async () => {
        if (!gameId) return;

        try {
            const fresh = await getMultiplayerGame(gameId);
            if (!mounted.current) return;

            setError(null);
            setGame(fresh);
            setViewing(fresh.currentRound);
        } catch (failure) {
            if (!mounted.current) return;

            setError(gameErrorMessage(failure));
        }
    }, [gameId]);

    useEffect(() => {
        if (!signedIn || !gameId) return;

        // set-state-in-effect: fetching the board on mount and storing it is the whole
        // job, and state is only written after the request resolves — `useGame` loads
        // the same way.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, gameId, load]);

    /**
     * Folds one row into the board.
     *
     * The only place the game moves, and it is deliberately reached by both paths:
     * the answer to your own guess and the broadcast of somebody else's are the same
     * type carrying the same fields, so a rule about how a row lands cannot end up
     * true for one and not the other.
     */
    const applyGuess = useCallback((result: MultiplayerGuessResult) => {
        // Whoever was typing has stopped: the row they were typing is now on the board.
        setTyping(null);

        setGame(current => {
            if (current === null) return current;

            // Already have it. Your own guess arrives twice -- once as the response,
            // once as the broadcast -- and a row added twice is a row that pushes the
            // board out of shape.
            const already = current.rounds
                .find(round => round.roundNumber === result.roundNumber)
                ?.guesses.some(guess => guess.id === result.guess.id);
            if (already === true) return current;

            const rounds = current.rounds.map(round => {
                if (round.roundNumber === result.roundNumber) {
                    return {
                        ...round,
                        guesses: [...round.guesses, result.guess],
                        // Arrives only when the round is over, and its presence is what
                        // the board reads as "this one is done".
                        word: result.word ?? round.word,
                        // A finished round stops counting down.
                        endsAt: undefined
                    };
                }

                // The round this guess opened, carrying the clock it opened with.
                if (result.nextRound !== undefined && round.roundNumber === result.nextRound.roundNumber) {
                    return { ...round, ...result.nextRound, endsAt: result.turn.endsAt };
                }

                return round;
            });

            return {
                ...current,
                rounds,
                currentRound: result.currentRound,
                status: result.gameOver ? 'completed' : current.status,
                players: result.players,
                turn: result.turn,
                // The reader's own score, kept in step with the scoreboard.
                score: result.players.find(player => player.userId === userId)?.score ?? current.score
            };
        });
    }, [userId]);

    /** The room's events, as far as the board is concerned. Lobby frames fall through. */
    const onEvent = useCallback((event: ServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state': {
                // A reconnect. Whatever happened while the connection was down is
                // already in this, so there is nothing to catch up on by hand.
                if (event.data.game === undefined) return;

                const fresh = event.data.game;
                setGame(current => (current === null || current.id === fresh.id ? fresh : current));
                setTyping(null);
                return;
            }

            case 'guess':
                applyGuess(event.data);
                return;

            case 'turn': {
                // A turn moving is also the end of whatever the last player was typing.
                setTyping(null);
                setGame(current => (current === null ? current : {
                    ...current,
                    turn: event.data,
                    currentRound: event.data.roundNumber ?? current.currentRound,
                    rounds: current.rounds.map(round => (
                        round.roundNumber === (event.data.roundNumber ?? current.currentRound)
                            ? { ...round, endsAt: event.data.endsAt }
                            : round
                    ))
                }));
                return;
            }

            case 'typing':
                // Only ever somebody else -- the server does not echo your own back.
                setTyping(event.data.letters);
                return;

            case 'game_over':
                setGame(current => (current === null ? current : {
                    ...current,
                    status: 'completed',
                    players: event.data.players
                }));
                return;

            default:
                // Lobby business, which `useLobby` is reading off its own connection to
                // the same room.
                return;
        }
    }, [applyGuess]);

    const { online, send } = useRoomSocket({
        room: gameId === undefined ? undefined : lolRoom(code),
        enabled: signedIn,
        onEvent
    });

    const guess = useCallback(async (word: string) => {
        if (!gameId) return;

        const result = await submitMultiplayerGuess(gameId, word);
        if (!mounted.current) return;

        // Here rather than in `applyGuess`, which also runs for rows the room broadcasts:
        // somebody else's word landing is not something your phone should announce.
        guessLandedHaptic(result);

        // Applied here as well as when the broadcast arrives, so the player who
        // guessed sees their row land at once rather than after a round trip through
        // the room. `applyGuess` drops the duplicate.
        applyGuess(result);
    }, [gameId, applyGuess]);

    /** When the last draft went out, so the next one can be spaced from it. */
    const lastSent = useRef(0);
    const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onTyping = useCallback((letters: string) => {
        const flush = () => {
            lastSent.current = Date.now();
            send({ type: 'typing', data: { letters } });
        };

        const since = Date.now() - lastSent.current;
        if (since >= TYPING_THROTTLE_MS) {
            flush();
            return;
        }

        // Trailing edge, so the last letter of a word is never the one that gets
        // dropped -- which is exactly the letter the people watching are waiting on.
        if (pending.current !== null) clearTimeout(pending.current);
        pending.current = setTimeout(() => {
            pending.current = null;
            flush();
        }, TYPING_THROTTLE_MS - since);
    }, [send]);

    useEffect(() => () => {
        if (pending.current !== null) clearTimeout(pending.current);
    }, []);

    const reload = useCallback(() => {
        setError(null);
        void load();
    }, [load]);

    const current = game?.id === gameId ? game : null;
    const round = current === null ? null : roundOf(current, viewing) ?? null;

    const nextRound = useCallback(() => {
        setViewing(showing => (game === null ? showing : game.currentRound));
    }, [game]);

    return {
        game: current,
        online,
        round,
        loading: current === null && error === null,
        error,
        myTurn: current?.turn?.userId !== undefined && current.turn.userId === userId,
        // Only while the board is showing the round actually being played: letters
        // relayed onto a finished round somebody is still reading would be noise.
        typing: current !== null && viewing === current.currentRound ? typing : null,
        reload,
        guess,
        onTyping,
        roundOver: round?.word !== undefined,
        gameOver: current?.status === 'completed',
        nextRound
    };
}
