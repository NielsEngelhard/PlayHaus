import type { useT } from '@/features/i18n/LanguageContext';
import { hotSeatTurnOf, isHotSeatRound } from '@/features/pubquizr/hot-seat';
import { answeringSeatOf, missedSeatsOf, type ControlState } from '@/features/pubquizr/multi-device/control';
import type { QuizDetail } from '@/features/pubquizr/pubquizr-quizzes';
import type { PQClosestProgress, QuizSession } from '@/features/pubquizr/pubquizr-sessions';
import { describeTurnOf, ROUND_DESCRIBE } from '@/features/pubquizr/round-four';
import { listTurnOf, ROUND_LIST } from '@/features/pubquizr/round-five';
import { finaleTurnOf, ROUND_FINALE } from '@/features/pubquizr/round-seven';
import { doubleDownTurnOf, ROUND_DOUBLE_DOWN } from '@/features/pubquizr/round-six';
import { closestTurnOf, ROUND_CLOSEST } from '@/features/pubquizr/round-three';
import { seatsOf, type Seat } from '@/features/pubquizr/seats';

// What a card is doing, which is the whole of what the players bar draws differently.
export type TablePlayerTone = 'idle' | 'master' | 'active' | 'beaten' | 'done';

export interface TablePlayer {
    seat: Seat
    tone: TablePlayerTone
    /** The word across the card, already translated, and empty for a card with nothing to say. */
    note: string
}

/** The waiting room, where nobody is doing anything yet. */
export function lobbyPlayersOf(seats: Seat[]): TablePlayer[] {
    return seats.map(seat => ({ seat, tone: 'idle', note: '' }));
}

// One card per player, told what that player is doing this round -- off the same turn helpers the stage itself draws from.
export function tablePlayersOf(
    t: ReturnType<typeof useT>,
    session: QuizSession,
    quiz: QuizDetail,
    control: ControlState,
    closest: PQClosestProgress | null
): TablePlayer[] {
    const seats = seatsOf(session);
    const round = session.currentRound;

    const marks = new Map<number, { tone: TablePlayerTone, note: string }>();
    const mark = (seat: number | null | undefined, tone: TablePlayerTone, note: string) => {
        if (seat === null || seat === undefined || seat < 0) return;

        marks.set(seat, { tone, note });
    };

    const walking = isHotSeatRound(round)
        ? hotSeatTurnOf(session, quiz)
        : round === ROUND_FINALE
            ? finaleTurnOf(session, quiz)
            : round === ROUND_DOUBLE_DOWN
                ? doubleDownTurnOf(session, quiz, session.activeQuestionId ?? null)
                : null;

    const describe = round === ROUND_DESCRIBE ? describeTurnOf(session, quiz) : null;
    const list = round === ROUND_LIST ? listTurnOf(session, quiz) : null;
    const closestTurn = round === ROUND_CLOSEST ? closestTurnOf(session, quiz) : null;

    if (walking !== null) {
        const answering = answeringSeatOf(control, walking.dealt.id) ?? walking.answering.seat;

        for (const seat of missedSeatsOf(control, walking.dealt.id)) {
            mark(seat, 'beaten', t('pubquizr.table.status.missed'));
        }

        mark(answering, 'active', t('pubquizr.table.status.turn'));
        mark(walking.quizmaster.seat, 'master', t('pubquizr.table.status.quizmaster'));
    } else if (closestTurn !== null) {
        const sent = closest !== null && closest.sessionQuestionId === closestTurn.dealt.id
            ? closest.seatsIn
            : [];

        for (const seat of closestTurn.guessing) {
            const inAlready = sent.includes(seat.seat);

            // Still typing is the ordinary state this round, so only a number that is in changes a card.
            mark(seat.seat, inAlready ? 'done' : 'idle', inAlready
                ? t('pubquizr.table.status.sent')
                : t('pubquizr.table.status.typing'));
        }

        mark(closestTurn.quizmaster.seat, 'master', t('pubquizr.table.status.quizmaster'));
    } else if (describe !== null) {
        mark(describe.guesser.seat, 'active', t('pubquizr.table.status.guessing'));
        mark(describe.describer.seat, 'master', t('pubquizr.table.status.describing'));
    } else if (list !== null) {
        mark(list.guesser.seat, 'active', t('pubquizr.table.status.guessing'));
        mark(list.quizmaster.seat, 'master', t('pubquizr.table.status.quizmaster'));
    } else if (round === ROUND_DOUBLE_DOWN) {
        // Before the question is pinned there is a choice instead, made on the phone whose turn it is.
        mark(session.answeringSeat, 'active', t('pubquizr.table.status.choosing'));
        mark(session.quizMasterSeat, 'master', t('pubquizr.table.status.quizmaster'));
    } else {
        mark(session.quizMasterSeat, 'master', t('pubquizr.table.status.quizmaster'));
    }

    return seats.map(seat => {
        const marked = marks.get(seat.seat);

        return { seat, tone: marked?.tone ?? 'idle', note: marked?.note ?? '' };
    });
}
