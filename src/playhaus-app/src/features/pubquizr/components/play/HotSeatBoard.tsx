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

// How far through one question's ritual the quizmaster is.
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
    // Whether the quizmaster may name the winner outright instead of walking the table a Wrong at a time.
    quickAssign?: boolean
    // Called once, with the settled question.
    onSettle: (missedSeats: number[], correctSeat: number | null, from: number) => void
}

// The board for rounds 1 and 2: a question, a covered answer, and the one decision on the screen.
export default function HotSeatBoard({
    turn,
    seats,
    round,
    lead,
    busy,
    error,
    quickAssign = false,
    onSettle
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // How far through the current question we are, and which question that was.
    const [progress, setProgress] = useState<{
        questionId: string | null
        stage: Stage
        // How far down the line the question has got.
        missed: number
    }>({ questionId: null, stage: 'covered', missed: 0 });

    // Reset during render rather than from an effect.
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered', missed: 0 });
    }

    // What this render is actually drawing.
    const fresh = progress.questionId !== turn.dealt.id;
    const stage: Stage = fresh ? 'covered' : progress.stage;
    const missed = fresh ? 0 : progress.missed;

    // Who the question is with, worked out here rather than read off the session.
    const answering = turn.remaining[missed] ?? turn.answering;
    const nextUp = turn.remaining[missed + 1] ?? null;
    /** Who just had it wrong, for the hand-off prompt. Null on a fresh question. */
    const handedFrom = missed > 0 ? turn.remaining[missed - 1] ?? null : null;
    // A run belongs to whoever is *holding* the seat.
    const run = missed === 0 ? turn.run : 0;

    // Captured rather than read off `turn` inside the callback.
    const questionId = turn.dealt.id;

    function moveTo(next: Stage) {
        setProgress({ questionId, stage: next, missed });
    }

    // The one thing that leaves the phone: the whole question, once.
    function settle(correctSeat: number | null, upTo: number) {
        onSettle(
            turn.remaining.slice(0, upTo).map(seat => seat.seat),
            correctSeat,
            turn.quizmaster.seat
        );
    }

    // What the two verdict buttons do, which is no longer one thing each.
    function handleWrongOrCorrect(correct: boolean) {
        if (correct) {
            settle(answering.seat, missed);
            return;
        }

        if (nextUp !== null) {
            setProgress({ questionId, stage: 'passed', missed: missed + 1 });
            return;
        }

        // Nobody left: the question beat the table.
        settle(null, turn.remaining.length);
    }

    // The shortcut past all of that: the quizmaster asked the table in a circle and is naming the winner, or saying that nobody got it.
    function handleQuickAssign(seat: number | null) {
        if (seat === null) {
            settle(null, turn.remaining.length);
            return;
        }

        const at = turn.remaining.findIndex(candidate => candidate.seat === seat);
        if (at < 0) return;

        settle(seat, at);
    }

    const strip = (
        <TurnStrip
            quizmaster={turn.quizmaster}
            answering={answering}
            lead={lead}
            run={run}
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
            onQuickAssign={quickAssign ? handleQuickAssign : undefined}
            onContinue={() => moveTo('judging')}
        />
    );

    if (turn.options.length > 0) {
        const revealed = stage !== 'covered';

        return (
            <View style={styles.turn}>
                {strip}

                {/* The same card either side of the reveal, down to the cue above it. */}
                <ScriptCard
                    prompt={turn.question.prompt}
                    cue={t('pubquizr.play.choice.readAll')}
                    size={26}
                    align="top"
                >
                    {/* Ruled off from the question, because they are the second half of the same utterance rather than more of the first. */}
                    <View style={styles.optionsRule}>
                        <ChoiceCard options={turn.options} revealed={revealed} />
                    </View>
                </ScriptCard>

                {notice}

                {/* The one thing that does swap. */}
                {stage === 'judging' ? verdict : stage === 'passed' && passOn ? passOn : (
                    <View style={styles.gate}>
                        <PopPressable
                            onPress={() => moveTo('judging')}
                            accessibilityRole="button"
                            accessibilityLabel={t('pubquizr.play.gate', {
                                name: answering.name
                            })}
                            style={styles.gateButton}
                        >
                            <Feather name="eye" size={18} color={Brand.ink} />

                            <AppText style={styles.gateLabel}>
                                {t('pubquizr.play.gate', { name: answering.name })}
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

const useStyles = createThemedStyles(theme => ({
    // The middle of the board grows and everything else does not.
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

    // Lemon rather than the mint `ValidateButton` wears.
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
