import TextHint from "@/components/text/TextHint";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState } from "react";
import { View } from "react-native";
import SeatPickRow from "./SeatPickRow";
import VerdictButtons from "./VerdictButtons";

interface Props {
    /** A ruling is already in the air. */
    busy: boolean
    // The answer is still covered, so nothing can be ruled yet.
    covered: boolean
    // Called once, with the settled question.
    onSettle: (missedSeats: number[], correctSeat: number | null) => void
    turn: HotSeatTurn
}

// How a hot seat question is ruled in every mode: Wrong / Correct at a two-player table, a row of seats to pick from anywhere else.
export default function SeatRuling({ busy, covered, onSettle, turn }: Props) {
    const t = useT();
    const styles = useStyles();

    const [progress, setProgress] = useState<{
        questionId: string | null
        /** Seats the quizmaster has ruled out by badge, in the order they were tapped. */
        ruledOut: number[]
        /** The seat named as having got it, waiting to be locked in. */
        picked: number | null
        /** "Nobody got it" has been tapped once and is waiting for the confirm tap. */
        confirmingNobody: boolean
    }>({ questionId: null, ruledOut: [], picked: null, confirmingNobody: false });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, ruledOut: [], picked: null, confirmingNobody: false });
    }

    // What this render is actually drawing.
    const fresh = progress.questionId !== turn.dealt.id;
    const ruledOut = fresh ? [] : progress.ruledOut;
    const picked = fresh ? null : progress.picked;
    const confirmingNobody = fresh ? false : progress.confirmingNobody;

    // Captured rather than read off `turn` inside the callbacks.
    const questionId = turn.dealt.id;

    function onPick(seat: number) {
        setProgress({
            questionId,
            ruledOut: ruledOut.filter(out => out !== seat),
            picked: picked === seat ? null : seat,
            confirmingNobody: false
        });
    }

    function onToggleOut(seat: number) {
        setProgress({
            questionId,
            ruledOut: ruledOut.includes(seat) ? ruledOut.filter(out => out !== seat) : [...ruledOut, seat],
            picked: picked === seat ? null : picked,
            confirmingNobody: false
        });
    }

    function onLockIn() {
        if (picked === null) return;

        const at = turn.remaining.findIndex(candidate => candidate.seat === picked);
        if (at < 0) return;

        // Exactly the seats ahead of them: the server refuses a settle whose misses are not a prefix of its own pass line, so a badge behind the winner is never sent.
        onSettle(turn.remaining.slice(0, at).map(candidate => candidate.seat), picked);
    }

    // Arms the confirm step rather than settling straight away, so a misclick doesn't skip the question.
    function onNobody() {
        setProgress({ questionId, ruledOut, picked, confirmingNobody: true });
    }

    function onConfirmNobody() {
        onSettle(turn.remaining.map(candidate => candidate.seat), null);
    }

    // At two players the line is one seat long, so wrong means nobody got it.
    function onVerdict(correct: boolean) {
        if (correct) {
            onSettle([], turn.answering.seat);
            return;
        }

        onSettle(turn.remaining.map(candidate => candidate.seat), null);
    }

    if (turn.twoPlayer) {
        return (
            <View style={styles.verdict}>
                <VerdictButtons
                    answering={turn.answering}
                    nextUp={null}
                    worth={turn.worth}
                    busy={covered || busy}
                    onVerdict={onVerdict}
                />

                {covered && <TextHint text={t('pubquizr.play.validateLocked')} />}
            </View>
        )
    }

    return (
        <SeatPickRow
            remaining={turn.remaining}
            ruledOut={ruledOut}
            picked={picked}
            confirmingNobody={confirmingNobody}
            covered={covered}
            locked={covered || busy}
            onPick={onPick}
            onToggleOut={onToggleOut}
            onNobody={onNobody}
            onConfirmNobody={onConfirmNobody}
            onLockIn={onLockIn}
        />
    )
}

const useStyles = createThemedStyles(() => ({
    verdict: {
        flexShrink: 0,
        gap: Spacing.two
    }
}))
