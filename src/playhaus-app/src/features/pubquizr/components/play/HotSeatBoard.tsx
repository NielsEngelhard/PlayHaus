import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { HotSeatTurn } from "@/features/pubquizr/hot-seat";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { View } from "react-native";
import BackstagePanel from "./BackstagePanel";
import ChoiceCard from "./ChoiceCard";
import QuestionRecap from "./QuestionRecap";
import ScriptCard from "./ScriptCard";
import TurnStrip from "./TurnStrip";
import ValidateButton from "@/components/ui/ValidateButton";
import VerdictButtons from "./VerdictButtons";

/**
 * How far through one question's ritual the quizmaster is.
 *
 * Three steps rather than two buttons, and every one of them is a guard. `covered` is
 * the answer still hidden from the rest of the table; `revealed` is the quizmaster
 * having read it; `judging` is the only state in which a tap can score anything. A
 * phone being turned round a table cannot fall through all three by accident.
 *
 * Round 2 takes them two at a time — see the note on `HotSeatBoard` — but the guard it
 * cares about is the same one: nothing that scores is reachable while the question is
 * still being read out.
 */
type Stage = 'covered' | 'revealed' | 'judging';

interface Props {
    turn: HotSeatTurn
    seats: Seat[]
    /** Which round this is, for the strip's pips. */
    round: number
    /** The strip's one-line sentence, unused here — both hot seat rounds name a seat. */
    lead: string
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
 * Both rounds are the same game — see `hot-seat.ts` — so they were the same board, drawn
 * from the same list of blocks with round 2's four options slotted in. That stopped
 * working the moment it met a real phone. Round 1 has three blocks under the strip and
 * round 2 has four; `ScriptCard` is the only one that flexes, so the whole of the extra
 * came off the question, and round 2 ended up reading its question at about the size of
 * the options underneath it. Which is backwards: the question is the only thing on the
 * screen that leaves the phone as speech.
 *
 * So round 2 is two screens rather than one crowded one, split at the moment the turn
 * actually changes character:
 *
 * **Reading.** The question and all four options are one card, and the only control is
 * the gate. Nothing else is on screen because nothing else is happening yet — the table
 * has not heard the fourth option.
 *
 * **Judging.** The question shrinks to a line you can tap to re-read, the three options
 * that are over fall back to ghosts, and the room goes to the answer and the verdict.
 *
 * The gate is where round 2's ritual differs from round 1's, and it is one tap rather
 * than two on purpose. The two things round 1 asks for separately — uncover the answer,
 * then unlock the verdict — happen at the same instant here, because the reveal is what
 * marks the right option in the list above it and the list is only worth marking once
 * somebody has shouted a letter. What matters is the guard, and the guard is intact:
 * while the phone is being read from and handed about, the only thing a stray thumb can
 * reach is a button whose whole effect is to show two more buttons.
 *
 * Round 1 keeps all three steps and its own layout. It has the room, and it is the round
 * where the covered panel sits on screen the longest.
 */
export default function HotSeatBoard({
    turn,
    seats,
    round,
    lead,
    busy,
    error,
    onVerdict
}: Props) {
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

    /** Whether the recap row has been unfolded back into the whole question. */
    const [rereading, setRereading] = useState(false);

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
        setRereading(false);
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

    const strip = (
        <TurnStrip
            quizmaster={turn.quizmaster}
            answering={turn.answering}
            lead={lead}
            run={turn.run}
            round={round}
            number={turn.number}
            total={turn.total}
            worth={turn.worth}
        />
    );

    const notice = error !== null && (
        <InlineNotification
            icon="alert-triangle"
            color={theme.colors.blush}
            message={t(error)}
        />
    );

    if (turn.options.length > 0) {
        if (stage === 'covered') {
            return (
                <View style={styles.turn}>
                    {strip}

                    <ScriptCard
                        prompt={turn.question.prompt}
                        cue={t('pubquizr.play.choice.readAll')}
                        size={26}
                        align="top"
                    >
                        {/* Ruled off from the question, because they are the second half
                            of the same utterance rather than more of the first. */}
                        <View style={styles.optionsRule}>
                            <ChoiceCard options={turn.options} revealed={false} />
                        </View>
                    </ScriptCard>

                    {notice}

                    <View style={styles.gate}>
                        <PopPressable
                            onPress={() => moveTo('judging')}
                            accessibilityRole="button"
                            accessibilityLabel={t('pubquizr.play.gate', {
                                name: turn.answering.name
                            })}
                            style={styles.gateButton}
                        >
                            <Feather name="eye" size={18} color={Brand.ink} />

                            <AppText style={styles.gateLabel}>
                                {t('pubquizr.play.gate', { name: turn.answering.name })}
                            </AppText>
                        </PopPressable>

                        <TextHint text={t('pubquizr.play.gateHint')} />
                    </View>
                </View>
            )
        }

        return (
            <View style={styles.turn}>
                {strip}

                <QuestionRecap
                    prompt={turn.question.prompt}
                    icon="volume-2"
                    hint={t('pubquizr.play.reread')}
                    expanded={rereading}
                    onPress={() => setRereading(current => !current)}
                />

                <ChoiceCard options={turn.options} revealed />

                {/* The answer takes the room the question was in. It is the thing being
                    read now, and the only one of the two that still has to be legible
                    from an arm's length across a table. */}
                <BackstagePanel
                    answer={turn.answer}
                    letter={turn.options.find(option => option.correct)?.letter}
                    aliases={turn.aliases}
                    revealed
                    // Never called: the gate is what uncovered this, and it is the only
                    // way onto this screen. The panel asks for it because round 1 needs
                    // it, where the uncovering is a step of its own.
                    onReveal={() => { }}
                    style={styles.answer}
                />

                {notice}

                <VerdictButtons
                    answering={turn.answering}
                    nextUp={turn.nextUp}
                    alwaysNextUp={turn.alwaysNextUp}
                    worth={turn.worth}
                    busy={busy}
                    onVerdict={correct => onVerdict(correct, turn.quizmaster.seat)}
                />
            </View>
        )
    }

    return (
        <View style={styles.turn}>
            {strip}

            <ScriptCard prompt={turn.question.prompt} seats={seats} />

            <BackstagePanel
                answer={turn.answer}
                aliases={turn.aliases}
                revealed={stage !== 'covered'}
                onReveal={() => moveTo('revealed')}
            />

            {notice}

            {stage === 'judging' ? (
                <VerdictButtons
                    answering={turn.answering}
                    nextUp={turn.nextUp}
                    alwaysNextUp={turn.alwaysNextUp}
                    worth={turn.worth}
                    busy={busy}
                    onVerdict={correct => onVerdict(correct, turn.quizmaster.seat)}
                />
            ) : (
                <ValidateButton
                    label={t('pubquizr.play.validate', { name: turn.answering.name })}
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

const useStyles = createThemedStyles(theme => ({
    // The middle of the board grows and everything else does not, so a long question
    // takes the slack rather than pushing the buttons off the bottom edge.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    // On the judging screen this is the middle of the board, so it is the block that
    // grows — with the question folded away there is nothing else that should.
    answer: {
        flex: 1,
        minHeight: 0
    },

    optionsRule: {
        paddingTop: 14,
        borderTopWidth: 2,
        borderTopColor: theme.colors.borderMuted
    },

    gate: {
        flexShrink: 0
    },

    // Lemon rather than the mint `ValidateButton` wears. Mint means "yes, this one" all
    // over this app — the Correct button, the right option, the nearest guess — and the
    // one button standing in front of the Correct button must not be wearing its colour.
    gateButton: {
        height: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hard)
    },

    // Ink on lemon in both schemes, because the fill is lemon in both.
    gateLabel: {
        fontSize: 16,
        fontWeight: 900,
        color: Brand.ink
    }
}))
