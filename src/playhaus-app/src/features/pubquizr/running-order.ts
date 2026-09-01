import type { QuizSession } from './pubquizr-sessions';

export function roundOrdinalOf(session: QuizSession): number {
    return ordinalOf(session, session.currentRound);
}

export function ordinalOf(session: QuizSession, round: number): number {
    const at = session.rounds?.indexOf(round) ?? -1;

    return at < 0 ? round : at + 1;
}

export function playsRound(session: QuizSession, round: number): boolean {
    return session.rounds?.includes(round) ?? true;
}
