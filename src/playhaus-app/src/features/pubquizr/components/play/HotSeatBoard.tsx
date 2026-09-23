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
import SeatRuling from "./SeatRuling";

interface Props {
    turn: HotSeatTurn
    /** A ruling is already in the air. */
    busy: boolean
    error: TranslationKey | null
    // Called once, with the settled question.
    onSettle: (missedSeats: number[], correctSeat: number | null, from: number) => void
}

// The board for the hot seat rounds: the question put to the table, its answer, and one ruling underneath.
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
    }>({ questionId: null, stage: 'covered', shown: false });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered', shown: false });
    }

    // What this render is actually drawing.
    const fresh = progress.questionId !== turn.dealt.id;
    const stage = fresh ? 'covered' : progress.stage;
    const shown = fresh ? false : progress.shown;

    // Captured rather than read off `turn` inside the callbacks.
    const questionId = turn.dealt.id;

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
                onReveal={() => setProgress({ questionId, stage: 'open', shown: true })}
                onHide={() => setProgress({ questionId, stage, shown: false })}
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
                <SeatRuling
                    turn={turn}
                    covered={stage === 'covered'}
                    busy={busy}
                    onSettle={(missedSeats, correctSeat) => onSettle(missedSeats, correctSeat, turn.quizmaster.seat)}
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
