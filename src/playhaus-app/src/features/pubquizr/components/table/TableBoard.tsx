import { useT } from "@/features/i18n/LanguageContext";
import TableFrame from "@/features/pubquizr/components/table/TableFrame";
import TableStage from "@/features/pubquizr/components/table/TableStage";
import type { ControlState } from "@/features/pubquizr/multi-device/control";
import { tablePlayersOf } from "@/features/pubquizr/multi-device/table-players";
import type { QuizDetail } from "@/features/pubquizr/pubquizr-quizzes";
import type { PQClosestProgress, PQClosestReveal, QuizSession } from "@/features/pubquizr/pubquizr-sessions";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { sessionPaysStars } from "@/features/pubquizr/round-seven";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";

interface Props {
    /** How far round 3's typing has got, and null in every other round. */
    closest: PQClosestProgress | null
    /** Bottom right, always: the code a latecomer joins on. */
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

// The shared screen once the evening is dealt: the permanent bars, and whatever round is being played between them.
export default function TableBoard({ closest, code, control, quiz, reveal, scale, session }: Props) {
    const t = useT();

    const ordinal = roundOrdinalOf(session);
    const { kind, rule } = roundKindAndRule(t, session.currentRound, session.zenMode, false, !sessionPaysStars(session));

    return (
        <TableFrame
            code={code}
            players={tablePlayersOf(t, session, quiz, control, closest)}
            round={{ kind, ordinal, total: session.totalRounds }}
            rule={rule}
            scale={scale}
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
