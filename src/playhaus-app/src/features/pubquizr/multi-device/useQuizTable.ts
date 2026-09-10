import { getPQLobby, type PQLobby } from '@/api/calls/pubquizr-lobby';
import { pqRoom, type PQClientEvent, type PQServerEvent } from '@/api/pq-socket';
import type { SocketStatus } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { applyControl, EMPTY_CONTROL, type ControlState, type PQEmit } from '@/features/pubquizr/multi-device/control';
import { pqLobbyErrorMessage } from '@/features/pubquizr/multi-device/pubquizr-lobby-errors';
import { quizErrorMessage } from '@/features/pubquizr/pubquizr-errors';
import { getQuizRequest, type QuizDetail } from '@/features/pubquizr/pubquizr-quizzes';
import {
    getMultiDeviceSessionRequest,
    recordMultiDeviceClosestGuessesRequest,
    recordMultiDeviceClosestGuessRequest,
    recordMultiDeviceDescribeAwardsRequest,
    recordMultiDeviceDoubleDownChoiceRequest,
    recordMultiDeviceDoubleDownTurnRequest,
    recordMultiDeviceFinaleTurnRequest,
    recordMultiDeviceHotSeatTurnRequest,
    recordMultiDeviceListAwardsRequest,
    type ListAward,
    type PQClosestProgress,
    type PQClosestReveal,
    type QuizSession,
    type SeatGuess,
    type WordAward
} from '@/features/pubquizr/pubquizr-sessions';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

// An evening, read. Both the shared screen and every phone in the room see the same room through here.

export interface PQTableState {
    lobby: PQLobby | null
    /** Whether this device is live. The screen's own dot. */
    connection: SocketStatus
    /** The host shut the room, or stopped the evening. The code is dead. */
    closed: boolean
    /** The room could not be read at all. There is nothing to draw. */
    error: TranslationKey | null
    loading: boolean
    /** Where this device sits, `-1` for a screen, which holds no seat, and null until the socket has said. */
    mySeat: number | null
    /** Who is connected right now, by user id. */
    online: Set<string>
    reload: () => void
    /** The evening this room dealt, or undefined while the room is still waiting. */
    sessionId: string | undefined

    /** How the evening is going. Null until the room has dealt one and the first read has landed. */
    session: QuizSession | null
    /** What is being played. Null until the session names it. */
    quiz: QuizDetail | null
    /** Everything the phones have said about the question the table is on. */
    control: ControlState
    /** How far round 3's typing has got, and null in every other round. Seats only -- the numbers are not in here. */
    closest: PQClosestProgress | null
    /** Round 3's last result, held until play resumes, which is what keeps it on the screen through a reload. */
    reveal: PQClosestReveal | null
    /** Says one thing about the question this device is looking at. Rendering state only -- a settle is an HTTP call. */
    emit: (frame: PQEmit) => void
    /** A ruling is in the air. The buttons lock rather than disappear. */
    ruling: boolean
    // A ruling was refused.
    rulingError: TranslationKey | null
    // Rounds 1 and 2: one whole question, settled. Only round 2 names the option, which is the one verdict the server checks.
    settleTurn: (missedSeats: number[], correctSeat: number | null, chosenAnswerId?: string) => void
    /** Round 3: this phone's own number. Its own flags, because it answers with a count rather than a table. */
    sendGuess: (value: number) => void
    guessing: boolean
    guessError: TranslationKey | null
    // Round 3: the question closed, scoring the numbers the phones sent plus whatever the quizmaster typed in for a phone that could not.
    settleClosest: (byHand: SeatGuess[]) => void
    /** Round 4: what became of each of the describer's words. */
    settleDescribe: (awards: WordAward[]) => void
    /** Round 5: what became of each of the question's four answers. */
    settleList: (awards: ListAward[]) => void
    /** Round 6: the question this phone asked for, pinned before anybody reads it out. */
    chooseDoubleDown: (sessionQuestionId: string) => void
    // Round 6: one chosen question, settled. The only settle handed a question id, because the choice belongs to the client.
    settleDoubleDown: (sessionQuestionId: string, missedSeats: number[], correctSeat: number | null) => void
    /** Round 7: the same as a hot seat turn, down a two seat line. */
    settleFinale: (missedSeats: number[], correctSeat: number | null) => void
}

// This hook never joins: reading a room is what having the code entitles you to, and the screen must not take a seat.
export function useQuizTable(code: string): PQTableState {
    const { status } = useAuth();

    const [lobby, setLobby] = useState<PQLobby | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [loading, setLoading] = useState(true);
    const [closed, setClosed] = useState(false);
    const [mySeat, setMySeat] = useState<number | null>(null);
    const [session, setSession] = useState<QuizSession | null>(null);
    const [quiz, setQuiz] = useState<QuizDetail | null>(null);
    const [control, setControl] = useState<ControlState>(EMPTY_CONTROL);
    const [closest, setClosest] = useState<PQClosestProgress | null>(null);
    const [reveal, setReveal] = useState<PQClosestReveal | null>(null);
    const [ruling, setRuling] = useState(false);
    const [rulingError, setRulingError] = useState<TranslationKey | null>(null);
    const [guessing, setGuessing] = useState(false);
    const [guessError, setGuessError] = useState<TranslationKey | null>(null);

    // A settle in flight owns the truth: its own answer is newer than anything the room can broadcast while it is in the air.
    const writing = useRef(false);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const signedIn = status === 'signedIn';

    const load = useCallback(async () => {
        if (!signedIn) return;

        try {
            const found = await getPQLobby(code);
            if (!mounted.current) return;

            setError(null);
            setLobby(found);
        } catch (failure) {
            if (!mounted.current) return;

            setError(pqLobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [signedIn, code]);

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: reading the room on mount and storing what came back is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, load]);

    const loadSession = useCallback(async () => {
        if (!signedIn) return;

        try {
            const fresh = await getMultiDeviceSessionRequest(code);
            if (!mounted.current) return;

            setSession(fresh);
        } catch (failure) {
            if (!mounted.current) return;

            setError(quizErrorMessage(failure));
        }
    }, [signedIn, code]);

    // A room that has not dealt has no evening to ask about, and asking would 404.
    const started = lobby?.status === 'started';

    useEffect(() => {
        if (!signedIn || !started) return;

        // set-state-in-effect: reading the evening the room dealt and storing it is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadSession();
    }, [signedIn, started, loadSession]);

    // The quiz is asked for second rather than alongside, because its id is on the session.
    const quizId = session?.quizId;

    useEffect(() => {
        if (!signedIn || quizId === undefined) return;

        let current = true;

        void (async () => {
            try {
                const content = await getQuizRequest(quizId);
                if (!current || !mounted.current) return;

                setQuiz(content);
            } catch (failure) {
                if (!current || !mounted.current) return;

                setError(quizErrorMessage(failure));
            }
        })();

        // Nothing to abort -- `request` has no signal -- so dropping the answer is the whole of the tidy-up.
        return () => { current = false; };
    }, [signedIn, quizId]);

    const onEvent = useCallback((event: PQServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state': {
                // The seat the server says this device holds, which for a screen is none.
                setMySeat(event.data.seat);
                setLobby(event.data.lobby);

                // The room's retained frames are the whole truth about the question it is on, so they replace rather than merge.
                setControl((event.data.control ?? []).reduce(applyControl, EMPTY_CONTROL));

                // Round 3 is the one round whose progress is the server's to remember, so it arrives the same way.
                setClosest(event.data.closest ?? null);
                setReveal(event.data.reveal ?? null);

                if (event.data.session !== undefined && !writing.current) {
                    setSession(event.data.session);
                }
                return;
            }

            case 'lobby': {
                setLobby(event.data.lobby);
                return;
            }

            case 'game_started': {
                // Carries no evening, only its id, so the board is asked for rather than read off the frame.
                setLobby(event.data.lobby);
                void loadSession();
                return;
            }

            case 'session':
            case 'session_over': {
                if (writing.current) return;

                setSession(event.data);
                return;
            }

            case 'control': {
                setControl(current => applyControl(current, event.data));
                // Round 3's result stays up until play resumes, and the first frame about another question is what that looks like.
                setReveal(current => current === null || current.sessionQuestionId === event.data.questionId
                    ? current
                    : null);
                return;
            }

            case 'closest_progress': {
                setClosest(event.data);
                // Somebody typing is the next question starting, so whatever result was up comes down.
                setReveal(null);
                return;
            }

            case 'closest_reveal': {
                setReveal(event.data);
                setClosest(null);
                return;
            }

            case 'lobby_closed': {
                setClosed(true);
                return;
            }

            default:
                // An error frame, which the socket's own status already tells the page about.
                return;
        }
    }, [loadSession]);

    const { online, send, status: connection } = useRoomSocket<PQServerEvent, PQClientEvent>({
        room: pqRoom(code),
        enabled: signedIn,
        onEvent
    });

    // The seat is a claim the server overwrites with the one it knows, so a phone cannot author as anybody else.
    const emit = useCallback((frame: PQEmit) => {
        send({ type: 'control', data: { ...frame, seat: mySeat ?? -1, at: Date.now() } });
    }, [send, mySeat]);

    // One way to move the evening on, whichever round is doing it.
    const submit = useCallback((move: (session: QuizSession) => Promise<QuizSession>) => {
        if (ruling || session === null) return;

        setRuling(true);
        setRulingError(null);
        writing.current = true;

        void (async () => {
            try {
                const moved = await move(session);
                if (!mounted.current) return;

                setSession(moved);
            } catch (failure) {
                if (!mounted.current) return;

                // The board stays up.
                setRulingError(quizErrorMessage(failure));
            } finally {
                writing.current = false;
                if (mounted.current) setRuling(false);
            }
        })();
    }, [ruling, session]);

    // Not through `submit`: a guess answers with a count rather than a table, and one phone typing must not lock the quizmaster's buttons.
    const sendGuess = useCallback((value: number) => {
        if (guessing || session === null) return;

        const [dealt] = session.turnQuestionIds;
        if (dealt === undefined) return;

        setGuessing(true);
        setGuessError(null);

        void (async () => {
            try {
                const progress = await recordMultiDeviceClosestGuessRequest(code, dealt, value);
                if (!mounted.current) return;

                // The same body the room is broadcasting, so a phone whose socket is down still sees its own number land.
                setClosest(progress);
                setReveal(null);
            } catch (failure) {
                if (!mounted.current) return;

                setGuessError(quizErrorMessage(failure));
            } finally {
                if (mounted.current) setGuessing(false);
            }
        })();
    }, [guessing, session, code]);

    // Which question a ruling is about comes off `turnQuestionIds` rather than being looked up by round and position.
    const settleTurn = useCallback((
        missedSeats: number[],
        correctSeat: number | null,
        chosenAnswerId?: string
    ) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordMultiDeviceHotSeatTurnRequest(code, dealt, missedSeats, correctSeat, chosenAnswerId);
        });
    }, [submit, code]);

    const settleClosest = useCallback((byHand: SeatGuess[]) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordMultiDeviceClosestGuessesRequest(code, dealt, byHand);
        });
    }, [submit, code]);

    const settleDescribe = useCallback((awards: WordAward[]) => {
        submit(current => {
            if (current.describerSeat === null) {
                return Promise.reject(new Error('nobody is describing'));
            }

            return recordMultiDeviceDescribeAwardsRequest(code, current.describerSeat, awards);
        });
    }, [submit, code]);

    const settleList = useCallback((awards: ListAward[]) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordMultiDeviceListAwardsRequest(code, dealt, awards);
        });
    }, [submit, code]);

    // Through `submit` because a choice answers with the whole table, narrowed to the question it pinned.
    const chooseDoubleDown = useCallback((sessionQuestionId: string) => {
        submit(() => recordMultiDeviceDoubleDownChoiceRequest(code, sessionQuestionId));
    }, [submit, code]);

    const settleDoubleDown = useCallback((
        sessionQuestionId: string,
        missedSeats: number[],
        correctSeat: number | null
    ) => {
        submit(() => recordMultiDeviceDoubleDownTurnRequest(code, sessionQuestionId, missedSeats, correctSeat));
    }, [submit, code]);

    const settleFinale = useCallback((missedSeats: number[], correctSeat: number | null) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordMultiDeviceFinaleTurnRequest(code, dealt, missedSeats, correctSeat);
        });
    }, [submit, code]);

    const reload = useCallback(() => {
        setLoading(true);
        void load();
        void loadSession();
    }, [load, loadSession]);

    return {
        lobby,
        connection,
        closed,
        error,
        loading,
        mySeat,
        online,
        reload,
        // A room that has started carries the evening it dealt.
        sessionId: started ? lobby?.sessionId : undefined,

        session,
        quiz,
        control,
        closest,
        reveal,
        emit,
        ruling,
        rulingError,
        sendGuess,
        guessing,
        guessError,
        settleTurn,
        settleClosest,
        settleDescribe,
        settleList,
        chooseDoubleDown,
        settleDoubleDown,
        settleFinale
    };
}
