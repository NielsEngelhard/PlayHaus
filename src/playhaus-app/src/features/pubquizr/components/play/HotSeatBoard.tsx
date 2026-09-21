import InlineNotification from "@/components/ui/InlineNotification";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";
import ChoiceCard from "./ChoiceCard";
import QuestionStack from "./QuestionStack";
import SeatPickRow from "./SeatPickRow";

interface Props {
    turn: HotSeatTurn
    /** A ruling is already in the air. */
    busy: boolean
    error: TranslationKey | null
    // Called once, with the settled question.
    onSettle: (missedSeats: number[], correctSeat: number | null, from: number) => void
}

// The board for the hot seat rounds: the question put to the table, its answer, and one row of seats to rule it with.
export default function HotSeatBoard({ turn, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // How far through the current question we are, and which question that was.
    const [progress, setProgress] = useState<{
        questionId: string | null
        stage: 'covered' | 'open'
        // Whether the answer is on screen right now; hiding it again leaves `stage` open.
        shown: boolean
        /** Seats the quizmaster has ruled out by badge, in the order they were tapped. */
        ruledOut: number[]
        /** The seat named as having got it, waiting to be locked in. */
        picked: number | null
        /** "Nobody got it" has been tapped once and is waiting for the confirm tap. */
        confirmingNobody: boolean
    }>({ questionId: null, stage: 'covered', shown: false, ruledOut: [], picked: null, confirmingNobody: false });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered', shown: false, ruledOut: [], picked: null, confirmingNobody: false });
    }

    // What this render is actually drawing.
    const fresh = progress.questionId !== turn.dealt.id;
    const stage = fresh ? 'covered' : progress.stage;
    const shown = fresh ? false : progress.shown;
    const ruledOut = fresh ? [] : progress.ruledOut;
    const picked = fresh ? null : progress.picked;
    const confirmingNobody = fresh ? false : progress.confirmingNobody;

    // Captured rather than read off `turn` inside the callbacks.
    const questionId = turn.dealt.id;

    function onPick(seat: number) {
        setProgress({
            questionId,
            stage,
            shown,
            ruledOut: ruledOut.filter(out => out !== seat),
            picked: picked === seat ? null : seat,
            confirmingNobody: false
        });
    }

    function onToggleOut(seat: number) {
        setProgress({
            questionId,
            stage,
            shown,
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
        onSettle(turn.remaining.slice(0, at).map(candidate => candidate.seat), picked, turn.quizmaster.seat);
    }

    // Arms the confirm step rather than settling straight away, so a misclick doesn't skip the question.
    function onNobody() {
        setProgress({ questionId, stage, shown, ruledOut, picked, confirmingNobody: true });
    }

    function onConfirmNobody() {
        onSettle(turn.remaining.map(candidate => candidate.seat), null, turn.quizmaster.seat);
    }

    const hasOptions = turn.options.length > 0;

    return (
        <View style={styles.turn}>
            <QuestionStack
                prompt={turn.question.prompt}
                category={turn.question.category}
                cue={hasOptions ? null : undefined}
                size={hasOptions ? 21 : 23}
                answer={turn.answer}
                aliases={turn.aliases}
                revealed={shown}
                showAnswerRow={!hasOptions}
                onReveal={() => setProgress({ questionId, stage: 'open', shown: true, ruledOut, picked, confirmingNobody })}
                onHide={() => setProgress({ questionId, stage, shown: false, ruledOut, picked, confirmingNobody })}
            >
                {hasOptions ? <ChoiceCard options={turn.options} revealed={shown} /> : undefined}
            </QuestionStack>

            {error !== null && (
                <View style={styles.spaced}>
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        message={t(error)}
                    />
                </View>
            )}

            <View style={styles.spaced}>
                <SeatPickRow
                    remaining={turn.remaining}
                    ruledOut={ruledOut}
                    picked={picked}
                    confirmingNobody={confirmingNobody}
                    covered={stage === 'covered'}
                    locked={stage === 'covered' || busy}
                    onPick={onPick}
                    onToggleOut={onToggleOut}
                    onNobody={onNobody}
                    onConfirmNobody={onConfirmNobody}
                    onLockIn={onLockIn}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    turn: {
        flex: 1,
        minHeight: 0
    },

    // Below the fanned stack's bottom sheet, which hangs 10 past the card.
    spaced: {
        flexShrink: 0,
        marginTop: 16
    }
}))
