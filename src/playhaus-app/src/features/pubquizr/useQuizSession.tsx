import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizRequest, type QuizDetail } from "./pubquizr-quizzes";
import { quizErrorMessage } from "./pubquizr-errors";
import {
    getSingleDeviceSessionRequest,
    recordClosestGuessesRequest,
    recordDescribeAwardsRequest,
    recordFinaleVerdictRequest,
    recordListAwardsRequest,
    recordOpenVerdictRequest,
    type ListAward,
    type QuizSession,
    type SeatGuess,
    type WordAward
} from "./pubquizr-sessions";

export type QuizSessionStatus = 'loading' | 'ready' | 'failed';

export interface PlayableSession {
    status: QuizSessionStatus
    /** How it is going. Null until the first load lands. */
    session: QuizSession | null
    /** What is being played. Null until the first load lands. */
    quiz: QuizDetail | null
    /** The load failed, as a catalogue key resolved at render. */
    error: TranslationKey | null
    /** A ruling is in the air. The buttons lock rather than disappear. */
    ruling: boolean
    /**
     * A ruling was refused. Kept apart from `error`, which means there is nothing on
     * screen at all — this one sits over a board that is still perfectly good.
     */
    rulingError: TranslationKey | null
    /** Rounds 1 and 2: was that right? */
    rule: (correct: boolean) => void
    /**
     * Round 3: whose number was nearest. Either every guess, and the server settles it,
     * or the winners outright when nobody wrote the numbers down.
     */
    settleClosest: (settled: { guesses: SeatGuess[] } | { winningSeats: number[] }) => void
    /** Round 4: what became of each of the describer's words. */
    settleDescribe: (awards: WordAward[]) => void
    /** Round 5: what became of each of the question's four answers. */
    settleList: (awards: ListAward[]) => void
    /** Round 6: was that right? Its own call rather than `rule` — see `round-six.ts`. */
    ruleFinale: (correct: boolean) => void
    reload: () => void
}

/**
 * One quiz being played, and the one way to move it on.
 *
 * Two requests rather than one, because they age differently. The quiz is the content
 * — twenty questions and their answers — and it cannot change while a game is running,
 * so it is fetched once and kept. The session is how the evening is going, and every
 * verdict replaces it wholesale with the server's own answer rather than being patched
 * in place: who reads next and whose turn it is to answer are the game's decisions, and
 * guessing at them here is how the screen and the database start to disagree.
 *
 * There is no polling and no socket. One phone is playing this, and it is the only
 * thing that can change the session.
 */
export function useQuizSession(sessionId: string): PlayableSession {
    const { status: auth } = useAuth();
    const [session, setSession] = useState<QuizSession | null>(null);
    const [quiz, setQuiz] = useState<QuizDetail | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [ruling, setRuling] = useState(false);
    const [rulingError, setRulingError] = useState<TranslationKey | null>(null);
    const [attempt, setAttempt] = useState(0);

    // Nothing may touch state after unmount — the way off this screen is the close
    // button, which can be pressed with a verdict still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /*
     * Only a signed-in session may ask for this one: the endpoint is behind auth.
     *
     * Restoring is not signed in yet and signed out has the gate standing over this
     * page, and asking in either state answers 401 — which this screen reads as an
     * expired session and says so, to somebody whose session is perfectly good.
     * Waiting means the board loads itself the moment there is somebody to load it
     * for, including straight after a sign-in on the gate.
     */
    const signedIn = auth === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        let current = true;

        void (async () => {
            try {
                const loaded = await getSingleDeviceSessionRequest(sessionId);
                // The quiz is asked for second rather than alongside, because its id
                // is on the session. One extra round trip on the way in buys a screen
                // that never has to cope with half a game.
                const content = await getQuizRequest(loaded.quizId);
                if (!current || !mounted.current) return;

                setSession(loaded);
                setQuiz(content);
                setError(null);
            } catch (failure) {
                if (!current || !mounted.current) return;

                setError(quizErrorMessage(failure));
            }
        })();

        // Nothing to abort — `request` has no signal — so dropping the answer is the
        // whole of the tidy-up, the same as `useQuizzes` next door.
        return () => { current = false; };
    }, [sessionId, attempt, signedIn]);

    /**
     * One way to move the game on, whichever round is doing it.
     *
     * Every round posts something different and gets the same thing back — the whole new
     * session, replacing this one wholesale rather than being patched in. So the locking,
     * the refusal handling and the unmount guard are the same three lines every time, and
     * they live here rather than three times over.
     */
    const submit = useCallback((move: (session: QuizSession) => Promise<QuizSession>) => {
        if (ruling || session === null) return;

        setRuling(true);
        setRulingError(null);

        void (async () => {
            try {
                const moved = await move(session);
                if (!mounted.current) return;

                setSession(moved);
            } catch (failure) {
                if (!mounted.current) return;

                // The board stays up. What is on it is still what the server thinks is
                // happening, and a refused ruling is a thing to try again rather than a
                // reason to throw the game away.
                setRulingError(quizErrorMessage(failure));
            } finally {
                if (mounted.current) setRuling(false);
            }
        })();
    }, [ruling, session]);

    /*
     * Which question a ruling is about comes off `turnQuestionIds` rather than being
     * looked up by round and position.
     *
     * Those two stopped being enough at round 4, where one turn covers several words and
     * the position counts turns rather than slots — looking a question up by it there
     * finds a word out of somebody else's thirty seconds. The server already knows what
     * it will accept, so it says.
     */
    const rule = useCallback((correct: boolean) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordOpenVerdictRequest(sessionId, dealt, correct);
        });
    }, [submit, sessionId]);

    const settleClosest = useCallback((
        settled: { guesses: SeatGuess[] } | { winningSeats: number[] }
    ) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordClosestGuessesRequest(sessionId, dealt, settled);
        });
    }, [submit, sessionId]);

    const settleDescribe = useCallback((awards: WordAward[]) => {
        submit(current => {
            if (current.describerSeat === null) {
                return Promise.reject(new Error('nobody is describing'));
            }

            return recordDescribeAwardsRequest(sessionId, current.describerSeat, awards);
        });
    }, [submit, sessionId]);

    const settleList = useCallback((awards: ListAward[]) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordListAwardsRequest(sessionId, dealt, awards);
        });
    }, [submit, sessionId]);

    const ruleFinale = useCallback((correct: boolean) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordFinaleVerdictRequest(sessionId, dealt, correct);
        });
    }, [submit, sessionId]);

    const reload = useCallback(() => setAttempt(previous => previous + 1), []);

    return {
        status: error !== null ? 'failed' : session === null || quiz === null ? 'loading' : 'ready',
        session,
        quiz,
        error,
        ruling,
        rulingError,
        rule,
        settleClosest,
        settleDescribe,
        settleList,
        ruleFinale,
        reload
    };
}
