import { ROUND_CHOICE } from '@/features/pubquizr/hot-seat';
import type { QuizSession } from '@/features/pubquizr/pubquizr-sessions';
import { ROUND_DESCRIBE } from '@/features/pubquizr/round-four';
import { seatAt, seatsOf, type Seat } from '@/features/pubquizr/seats';

// Who runs the turn right now: nobody in round 2, and whoever holds the words in round 4.
export function currentQuizmasterOf(session: QuizSession): Seat | null {
    if (session.currentRound === ROUND_CHOICE) return null;

    return seatAt(seatsOf(session), session.currentRound === ROUND_DESCRIBE ? session.describerSeat : session.quizMasterSeat);
}
