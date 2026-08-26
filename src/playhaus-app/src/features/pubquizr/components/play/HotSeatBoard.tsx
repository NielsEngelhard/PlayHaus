import InlineNotification from "@/components/ui/InlineNotification";
import { useT } from "@/features/i18n/LanguageContext";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { useState } from "react";
import { View } from "react-native";
import BackstagePanel from "./BackstagePanel";
import ChoiceCard from "./ChoiceCard";
import ScriptCard from "./ScriptCard";
import TurnBanner from "./TurnBanner";
import ValidateButton from "./ValidateButton";
import VerdictButtons from "./VerdictButtons";

/**
 * How far through one question's ritual the quizmaster is.
 *
 * Three steps rather than two buttons, and every one of them is a guard. `covered` is
 * the answer still hidden from the rest of the table; `revealed` is the quizmaster
 * having read it; `judging` is the only state in which a tap can score anything. A
 * phone being turned round a table cannot fall through all three by accident.
 */
type Stage = 'covered' | 'revealed' | 'judging';

interface Props {
    turn: HotSeatTurn
    seats: Seat[]
    /** A ruling is already in the air. */
    busy: boolean
    error: TranslationKey | null
    /** Called with the verdict, and with who was reading when it was given. */
    onVerdict: (correct: boolean, from: number) => void
}

/**
 * The board for rounds 1 and 2: a question, a covered answer, and the one decision on
 * the screen.
 *
 * Both rounds are the same game — see `hot-seat.ts` — so they are the same board. Round 2
 * puts four options between the question and the covered panel and pays double; nothing
 * else about the screen changes, and nothing here has to know which of the two it is
 * drawing beyond whether there are options to draw.
 */
export default function HotSeatBoard({ turn, seats, busy, error, onVerdict }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    /**
     * How far through the current question we are, and which question that was.
     *
     * The id travels with the stage so the ritual resets itself: a new question is a
     * different id, which is a covered answer again. Holding the two apart would mean
     * remembering to reset one from wherever the other changes, and the one place that
     * would eventually be forgotten is the one that leaves the next question's answer
     * already on screen.
     */
    const [progress, setProgress] = useState<{ questionId: string | null, stage: Stage }>(
        { questionId: null, stage: 'covered' }
    );

    /*
     * Reset during render rather than from an effect.
     *
     * A new question has to arrive with its answer already covered, in the same commit
     * that brings it. Cleared afterwards, the board paints once showing the last
     * question's revealed panel over the new question's prompt — which is the answer to
     * a question nobody has been asked yet, in front of the whole table. Same reason
     * `useQuizzes` empties its shelf during render.
     */
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered' });
    }

    // What this render is actually drawing. React restarts the render on the setState
    // above, so this only stands in for one discarded pass.
    const stage: Stage = progress.questionId === turn.dealt.id ? progress.stage : 'covered';

    // Captured rather than read off `turn` inside the callback: this is a hoisted
    // function, so TypeScript cannot see that the value it closes over is the current one.
    const questionId = turn.dealt.id;

    function moveTo(next: Stage) {
        setProgress({ questionId, stage: next });
    }

    return (
        <View style={styles.turn}>
            <TurnBanner
                quizmaster={turn.quizmaster}
                answering={turn.answering}
                run={turn.run}
            />

            <ScriptCard prompt={turn.question.prompt} seats={seats} />

            {turn.options.length > 0 && (
                <ChoiceCard options={turn.options} revealed={stage !== 'covered'} />
            )}

            <BackstagePanel
                answer={turn.answer}
                aliases={turn.aliases}
                revealed={stage !== 'covered'}
                onReveal={() => moveTo('revealed')}
            />

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    message={t(error)}
                />
            )}

            {stage === 'judging' ? (
                <VerdictButtons
                    answering={turn.answering}
                    nextUp={turn.nextUp}
                    worth={turn.worth}
                    busy={busy}
                    onVerdict={correct => onVerdict(correct, turn.quizmaster.seat)}
                />
            ) : (
                <ValidateButton
                    answering={turn.answering}
                    unlocked={stage === 'revealed'}
                    onPress={() => moveTo('judging')}
                />
            )}
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The middle of the board grows and everything else does not, so a long question
    // takes the slack rather than pushing the buttons off the bottom edge.
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 14
    }
}))
