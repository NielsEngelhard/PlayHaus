import type { TranslationKey } from "@/features/i18n/keys";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizRequest, type QuizDetail } from "./pubquizr-quizzes";
import { quizErrorMessage } from "./pubquizr-errors";
import {
    getSingleDeviceSessionRequest,
    recordOpenVerdictRequest,
    type QuizSession
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
    /** A verdict is in the air. The buttons lock rather than disappear. */
    ruling: boolean
    /**
     * A verdict was refused. Kept apart from `error`, which means there is nothing on
     * screen at all — this one sits over a board that is still perfectly good.
     */
    rulingError: TranslationKey | null
    rule: (correct: boolean) => void
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

    useEffect(() => {
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
    }, [sessionId, attempt]);

    const rule = useCallback((correct: boolean) => {
        if (ruling || session === null) return;

        const dealt = session.questions.find(
            question => question.round === session.currentRound
                && question.position === session.currentPosition
        );
        if (dealt === undefined) return;

        setRuling(true);
        setRulingError(null);

        void (async () => {
            try {
                const moved = await recordOpenVerdictRequest(sessionId, dealt.id, correct);
                if (!mounted.current) return;

                setSession(moved);
            } catch (failure) {
                if (!mounted.current) return;

                // The board stays up. What is on it is still what the server thinks is
                // happening, and a refused verdict is a thing to try again rather than
                // a reason to throw the game away.
                setRulingError(quizErrorMessage(failure));
            } finally {
                if (mounted.current) setRuling(false);
            }
        })();
    }, [ruling, session, sessionId]);

    const reload = useCallback(() => setAttempt(previous => previous + 1), []);

    return {
        status: error !== null ? 'failed' : session === null || quiz === null ? 'loading' : 'ready',
        session,
        quiz,
        error,
        ruling,
        rulingError,
        rule,
        reload
    };
}
