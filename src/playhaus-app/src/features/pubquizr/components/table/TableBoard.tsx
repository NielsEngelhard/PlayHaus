import { useT } from "@/features/i18n/LanguageContext";
import TableFrame from "@/features/pubquizr/components/table/TableFrame";
import TableStage from "@/features/pubquizr/components/table/TableStage";
import { answeringSeatOf, type ControlState } from "@/features/pubquizr/multi-device/control";
import type { QuizDetail } from "@/features/pubquizr/pubquizr-quizzes";
import type { PQClosestProgress, PQClosestReveal, QuizSession } from "@/features/pubquizr/pubquizr-sessions";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";
import { seatAt, seatsOf } from "@/features/pubquizr/seats";

interface Props {
    /** How far round 3's typing has got, and null in every other round. */
    closest: PQClosestProgress | null
    /** Top-left, always: the code a latecomer joins on. */
    code: string
    /** Everything the phones have said about the question the table is on. */
    control: ControlState
    quiz: QuizDetail
    /** Round 3's result while the room is still showing it. */
    reveal: PQClosestReveal | null
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    session: QuizSession
}

// The shared screen once the evening is dealt: the permanent corners, and whatever round is being played in the middle.
export default function TableBoard({ closest, code, control, quiz, reveal, scale, session }: Props) {
    const t = useT();

    const seats = seatsOf(session);
    const ordinal = roundOrdinalOf(session);
    const { kind } = roundKindAndRule(t, session.currentRound, session.zenMode);

    // The question the table is on, which is what every frame in `control` is about.
    const [dealt] = session.turnQuestionIds;
    // Rounds 4 and 5 ask one person without moving the hot seat, so they name a guesser and leave the answering seat empty.
    const asked = session.answeringSeat ?? session.guesserSeat;
    // The walk the phones are reporting wins over the seat the last settle left behind, because it is newer.
    const guesser = dealt === undefined
        ? asked
        : answeringSeatOf(control, dealt) ?? asked;

    return (
        <TableFrame
            code={code}
            guesser={seatAt(seats, guesser)}
            label={t('pubquizr.play.roundLabel', { round: ordinal, kind })}
            quizmaster={seatAt(seats, session.quizMasterSeat)}
            scale={scale}
            seats={seats}
        >
            <TableStage
                closest={closest}
                control={control}
                quiz={quiz}
                reveal={reveal}
                scale={scale}
                session={session}
            />
        </TableFrame>
    )
}
