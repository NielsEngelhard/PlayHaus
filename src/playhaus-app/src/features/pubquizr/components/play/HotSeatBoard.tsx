import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import AnswerReveal from "@/components/ui/AnswerReveal";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import ValidateButton from "@/components/ui/ValidateButton";
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
import ChoiceCard from "./ChoiceCard";
import PassOnPrompt from "./PassOnPrompt";
import ScriptCard from "./ScriptCard";
import TurnStrip from "./TurnStrip";
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
 *
 * `passed` is the fourth: a wrong answer with somebody left in `nextUp` — rounds 1, 2 and
 * 6 all pass the same question on round the table exactly the same way — does not go
 * straight back to `judging` for them. The strip at the top already changes to say who
 * that is, but it is too easy to miss on a phone being passed round a table, so the
 * buttons stand down for one more tap that names it outright — see `PassOnPrompt`.
 */
type Stage = 'covered' | 'revealed' | 'judging' | 'passed';

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
 * So round 2 gets a layout of its own: the question and all four options in one card,
 * with the room the question needs to be read from.
 *
 * That card does not move when the answer comes up, and that is the point of this round's
 * screen. It used to: the question folded away into a tappable recap line, the three
 * options that were over fell back to 38-point ghosts, and an answer panel opened
 * underneath — so the one tap in the middle of the turn rebuilt everything on screen, in
 * front of a table that had just been read to and was in the middle of answering. The
 * quizmaster then had to find their place again to say which one it was.
 *
 * Now nothing moves. The right option turns mint where it stands, and the gate underneath
 * is replaced by the two verdict buttons. The list *is* the answer panel — the answer to
 * a multiple choice question is one of four rows already on the screen, and putting it in
 * a panel of its own was saying it twice in two shapes.
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
    const [progress, setProgress] = useState<{
        questionId: string | null
        stage: Stage
        /**
         * Only set while `stage` is `'passed'`: who just had it wrong, and who it
         * passed to. Captured at the moment "Wrong" is pressed rather than read back
         * off `turn` once the ruling round-trips, so the prompt names the right two
         * people the instant it appears instead of flashing the old answerer while the
         * request is still in flight.
         */
        handoff: { from: Seat, to: Seat } | null
    }>({ questionId: null, stage: 'covered', handoff: null });

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
        setProgress({ questionId: turn.dealt.id, stage: 'covered', handoff: null });
    }

    // What this render is actually drawing. React restarts the render on the setState
    // above, so this only stands in for one discarded pass.
    //
    // One more fallback lives here: a ruling that came back refused leaves `session`
    // exactly as it was — see `useQuizSession` — so a "Wrong" that never happened has no
    // business leaving the buttons stood down. `busy` guards this from firing mid-flight,
    // while the verdict is still in the air and there is nothing refused yet to see.
    const stage: Stage = progress.questionId !== turn.dealt.id
        ? 'covered'
        : progress.stage === 'passed' && error !== null && !busy
            ? 'judging'
            : progress.stage;

    // Captured rather than read off `turn` inside the callback: this is a hoisted
    // function, so TypeScript cannot see that the value it closes over is the current one.
    const questionId = turn.dealt.id;

    function moveTo(next: Stage) {
        setProgress({ questionId, stage: next, handoff: null });
    }

    /**
     * The one thing "Wrong" does before it also does the real thing.
     *
     * A wrong answer with somebody left in `nextUp` does not go straight back to a
     * judging board for them — it stands the buttons down for `PassOnPrompt` first, so
     * the hand-off is a thing that happened rather than a thing the top strip quietly
     * changed to say. Correct answers, and a wrong one with nobody left to ask, are
     * unaffected: both already end in a new `dealt.id` or a finished round, which resets
     * the ritual on its own.
     */
    function handleWrongOrCorrect(correct: boolean) {
        if (!correct && turn.nextUp !== null) {
            setProgress({
                questionId,
                stage: 'passed',
                handoff: { from: turn.answering, to: turn.nextUp }
            });
        }

        onVerdict(correct, turn.quizmaster.seat);
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
        const revealed = stage !== 'covered';

        return (
            <View style={styles.turn}>
                {strip}

                {/*
                  * The same card either side of the reveal, down to the cue above it. The
                  * only thing the tap changes inside it is which row is mint — everything
                  * the table has been read is still where it was, in the size it was read
                  * at, so the quizmaster is naming a row rather than finding one again.
                  */}
                <ScriptCard
                    prompt={turn.question.prompt}
                    cue={t('pubquizr.play.choice.readAll')}
                    size={26}
                    align="top"
                >
                    {/* Ruled off from the question, because they are the second half
                        of the same utterance rather than more of the first. */}
                    <View style={styles.optionsRule}>
                        <ChoiceCard options={turn.options} revealed={revealed} />
                    </View>
                </ScriptCard>

                {notice}

                {/* The one thing that does swap. Which is the guard: nothing that scores
                    is on screen until the gate has been pressed on purpose. */}
                {stage === 'judging' ? (
                    <VerdictButtons
                        answering={turn.answering}
                        nextUp={turn.nextUp}
                        alwaysNextUp={turn.alwaysNextUp}
                        worth={turn.worth}
                        busy={busy}
                        onVerdict={handleWrongOrCorrect}
                    />
                ) : stage === 'passed' && progress.handoff !== null ? (
                    <PassOnPrompt
                        from={progress.handoff.from}
                        to={progress.handoff.to}
                        busy={busy}
                        onContinue={() => moveTo('judging')}
                    />
                ) : (
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
                )}
            </View>
        )
    }

    return (
        <View style={styles.turn}>
            {strip}

            <ScriptCard prompt={turn.question.prompt} seats={seats} />

            <AnswerReveal
                key={turn.question.id}
                answer={turn.answer}
                aliases={turn.aliases}
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
                    onVerdict={handleWrongOrCorrect}
                />
            ) : stage === 'passed' && progress.handoff !== null ? (
                <PassOnPrompt
                    from={progress.handoff.from}
                    to={progress.handoff.to}
                    busy={busy}
                    onContinue={() => moveTo('judging')}
                />
            ) : (
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

const useStyles = createThemedStyles(theme => ({
    // The middle of the board grows and everything else does not, so a long question
    // takes the slack rather than pushing the buttons off the bottom edge.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
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
        ...theme.shadows.hard
    },

    // Ink on lemon in both schemes, because the fill is lemon in both.
    gateLabel: {
        fontSize: 16,
        fontWeight: 900,
        color: Brand.ink
    }
}))
