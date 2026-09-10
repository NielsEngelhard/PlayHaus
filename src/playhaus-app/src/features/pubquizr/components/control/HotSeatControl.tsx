import AnswerReveal from "@/components/ui/AnswerReveal";
import InlineNotification from "@/components/ui/InlineNotification";
import ValidateButton from "@/components/ui/ValidateButton";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import PassOnPrompt from "@/features/pubquizr/components/play/PassOnPrompt";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import VerdictButtons from "@/features/pubquizr/components/play/VerdictButtons";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import type { PQEmit, PQStage } from "@/features/pubquizr/multi-device/control";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
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

// The quizmaster's controller for rounds 1 and 7: a question to read out, a covered answer, and the one decision on the phone.
export default function HotSeatControl({ busy, emit, error, onSettle, round, turn }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    // How far through the current question we are, and which question that was.
    const [progress, setProgress] = useState<{
        questionId: string | null
        stage: PQStage
        // How far down the line the question has got.
        missed: number
    }>({ questionId: null, stage: 'covered', missed: 0 });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered', missed: 0 });
    }

    // What this render is actually drawing.
    const fresh = progress.questionId !== turn.dealt.id;
    const stage: PQStage = fresh ? 'covered' : progress.stage;
    const missed = fresh ? 0 : progress.missed;

    // Who the question is with, worked out here rather than read off the session.
    const answering = turn.remaining[missed] ?? turn.answering;
    const nextUp = turn.remaining[missed + 1] ?? null;
    /** Who just had it wrong, for the hand-off prompt. Null on a fresh question. */
    const handedFrom = missed > 0 ? turn.remaining[missed - 1] ?? null : null;
    // A run belongs to whoever is *holding* the seat.
    const run = missed === 0 ? turn.run : 0;

    // Captured rather than read off `turn` inside the callbacks.
    const questionId = turn.dealt.id;

    function moveTo(next: PQStage) {
        setProgress({ questionId, stage: next, missed });
        emit({ kind: 'flow', questionId, stage: next });
    }

    // The one thing that leaves the phone over HTTP: the whole question, once.
    function settle(correctSeat: number | null, upTo: number) {
        onSettle(turn.remaining.slice(0, upTo).map(seat => seat.seat), correctSeat);
    }

    // What the two verdict buttons do, which is no longer one thing each.
    function handleWrongOrCorrect(correct: boolean) {
        if (correct) {
            settle(answering.seat, missed);
            return;
        }

        if (nextUp !== null) {
            setProgress({ questionId, stage: 'passed', missed: missed + 1 });
            emit({ kind: 'flow', questionId, stage: 'passed' });
            // The whole walk, always in full, so a lost frame is repaired by the next one.
            emit({
                kind: 'walk',
                questionId,
                answeringSeat: nextUp.seat,
                missedSeats: turn.remaining.slice(0, missed + 1).map(seat => seat.seat)
            });
            return;
        }

        // Nobody left: the question beat the table.
        settle(null, turn.remaining.length);
    }

    const notice = error !== null && (
        <InlineNotification
            icon="alert-triangle"
            color={theme.colors.blush}
            message={t(error)}
        />
    );

    const verdict = (
        <VerdictButtons
            answering={answering}
            nextUp={nextUp}
            alwaysNextUp={turn.alwaysNextUp}
            worth={turn.worth}
            busy={busy}
            onVerdict={handleWrongOrCorrect}
        />
    );

    const passOn = handedFrom !== null && (
        <PassOnPrompt
            from={handedFrom}
            to={answering}
            busy={busy}
            remaining={turn.remaining.slice(missed)}
            onContinue={() => moveTo('judging')}
        />
    );

    return (
        <View style={styles.turn}>
            {/* Drawn here rather than by `ControlFrame`, because the walk this phone is on is its own local state. */}
            <TurnStrip
                quizmaster={turn.quizmaster}
                answering={answering}
                lead=""
                run={run}
                round={round}
                number={turn.number}
                total={turn.total}
                worth={turn.worth}
            />

            {/* No score strip: the shared screen has the scores in its corner. */}
            <ScriptCard prompt={turn.question.prompt} />

            <AnswerReveal
                key={turn.question.id}
                answer={turn.answer}
                aliases={turn.aliases}
                onReveal={() => {
                    moveTo('revealed');
                    // Unlike a stage, an uncovered answer does not go back -- and the screen shows it too.
                    emit({ kind: 'reveal', questionId, revealed: true });
                }}
            />

            {notice}

            {stage === 'judging' ? verdict : stage === 'passed' && passOn ? passOn : (
                <ValidateButton
                    label={t('pubquizr.play.validate')}
                    hint={stage === 'revealed'
                        ? t('pubquizr.play.validateHint')
                        : t('pubquizr.play.validateLocked')}
                    unlocked={stage === 'revealed'}
                    onPress={() => moveTo('judging')}
                />
            )}
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
