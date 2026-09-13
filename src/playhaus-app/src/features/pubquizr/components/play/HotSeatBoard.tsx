import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
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
import TableBand from "./TableBand";

interface Props {
    turn: HotSeatTurn
    /** Which round this is, for the band's pips. */
    round: number
    /** A ruling is already in the air. */
    busy: boolean
    error: TranslationKey | null
    // Called once, with the settled question.
    onSettle: (missedSeats: number[], correctSeat: number | null, from: number) => void
}

// The board for the hot seat rounds: the question put to the table, its answer, and one row of seats to rule it with.
export default function HotSeatBoard({ turn, round, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // How far through the current question we are, and which question that was.
    const [progress, setProgress] = useState<{
        questionId: string | null
        stage: 'covered' | 'open'
        /** Seats the quizmaster has ruled out by badge, in the order they were tapped. */
        ruledOut: number[]
        /** The seat named as having got it, waiting to be locked in. */
        picked: number | null
    }>({ questionId: null, stage: 'covered', ruledOut: [], picked: null });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered', ruledOut: [], picked: null });
    }

    // What this render is actually drawing.
    const fresh = progress.questionId !== turn.dealt.id;
    const stage = fresh ? 'covered' : progress.stage;
    const ruledOut = fresh ? [] : progress.ruledOut;
    const picked = fresh ? null : progress.picked;

    // Captured rather than read off `turn` inside the callbacks.
    const questionId = turn.dealt.id;

    function onPick(seat: number) {
        setProgress({
            questionId,
            stage,
            ruledOut: ruledOut.filter(out => out !== seat),
            picked: picked === seat ? null : seat
        });
    }

    function onToggleOut(seat: number) {
        setProgress({
            questionId,
            stage,
            ruledOut: ruledOut.includes(seat) ? ruledOut.filter(out => out !== seat) : [...ruledOut, seat],
            picked: picked === seat ? null : picked
        });
    }

    function onLockIn() {
        if (picked === null) return;

        const at = turn.remaining.findIndex(candidate => candidate.seat === picked);
        if (at < 0) return;

        // Exactly the seats ahead of them: the server refuses a settle whose misses are not a prefix of its own pass line, so a badge behind the winner is never sent.
        onSettle(turn.remaining.slice(0, at).map(candidate => candidate.seat), picked, turn.quizmaster.seat);
    }

    function onNobody() {
        onSettle(turn.remaining.map(candidate => candidate.seat), null, turn.quizmaster.seat);
    }

    const hasOptions = turn.options.length > 0;

    return (
        <View style={styles.turn}>
            <TableBand
                quizmaster={turn.quizmaster}
                round={round}
                number={turn.number}
                total={turn.total}
                worth={turn.worth}
            />

            <QuestionStack
                prompt={turn.question.prompt}
                category={turn.question.category}
                cue={hasOptions ? t('pubquizr.play.choice.readAll') : undefined}
                size={hasOptions ? 21 : 23}
                answer={turn.answer}
                aliases={turn.aliases}
                revealed={stage === 'open'}
                showAnswerRow={!hasOptions}
                onReveal={() => setProgress({ questionId, stage: 'open', ruledOut, picked })}
            >
                {hasOptions ? <ChoiceCard options={turn.options} revealed={stage === 'open'} /> : undefined}
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
                    covered={stage === 'covered'}
                    locked={stage === 'covered' || busy}
                    onPick={onPick}
                    onToggleOut={onToggleOut}
                    onNobody={onNobody}
                    onLockIn={onLockIn}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // Pulled up over the page's gap, so the band meets the header's bottom line; no gap of its own, so the card can overlap the band exactly.
    turn: {
        marginTop: -(Spacing.three - 4),
        flex: 1,
        minHeight: 0
    },

    // Below the fanned stack's bottom sheet, which hangs 10 past the card.
    spaced: {
        flexShrink: 0,
        marginTop: 16
    }
}))
