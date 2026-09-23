import AnswerReveal from "@/components/ui/AnswerReveal";
import InlineNotification from "@/components/ui/InlineNotification";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import SeatRuling from "@/features/pubquizr/components/play/SeatRuling";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import type { PQEmit, PQStage } from "@/features/pubquizr/multi-device/control";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** The frame draws the strip, so this board leaves it out. */
    bare?: boolean
    /** A ruling is already in the air. */
    busy: boolean
    /** Says one thing about the question this phone is looking at. */
    emit: (frame: PQEmit) => void
    error: TranslationKey | null
    // Called once, with the settled question.
    onSettle: (missedSeats: number[], correctSeat: number | null) => void
    /** Which round this is, for the strip. */
    round: number
    turn: HotSeatTurn
}

// The quizmaster's controller for rounds 1, 6 and 7: a question to read out, a covered answer, and the one ruling on the phone.
export default function HotSeatControl({ bare, busy, emit, error, onSettle, round, turn }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    // How far through the current question we are, and which question that was.
    const [progress, setProgress] = useState<{
        questionId: string | null
        stage: PQStage
    }>({ questionId: null, stage: 'covered' });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered' });
    }

    // What this render is actually drawing.
    const stage: PQStage = progress.questionId !== turn.dealt.id ? 'covered' : progress.stage;

    // Captured rather than read off `turn` inside the callbacks.
    const questionId = turn.dealt.id;

    const notice = error !== null && (
        <InlineNotification
            icon="alert-triangle"
            color={theme.colors.blush}
            message={t(error)}
        />
    );

    return (
        <View style={styles.turn}>
            {!bare && (
                <TurnStrip
                    quizmaster={turn.quizmaster}
                    answering={turn.answering}
                    lead=""
                    run={turn.run}
                    round={round}
                    number={turn.number}
                    total={turn.total}
                    worth={turn.worth}
                />
            )}

            {/* No score strip: the shared screen has the scores in its corner. */}
            <ScriptCard prompt={turn.question.prompt} />

            <AnswerReveal
                key={turn.question.id}
                answer={turn.answer}
                aliases={turn.aliases}
                onReveal={() => {
                    setProgress({ questionId, stage: 'revealed' });
                    emit({ kind: 'flow', questionId, stage: 'revealed' });
                    // Unlike a stage, an uncovered answer does not go back -- and the screen shows it too.
                    emit({ kind: 'reveal', questionId, revealed: true });
                }}
            />

            {notice}

            <SeatRuling
                turn={turn}
                covered={stage === 'covered'}
                busy={busy}
                onSettle={onSettle}
            />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The middle of the board grows and everything else does not.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    }
}))
