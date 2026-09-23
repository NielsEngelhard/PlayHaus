import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import InlineNotification from "@/components/ui/InlineNotification";
import { usePressPop } from "@/components/ui/usePressPop";
import { Brand, FontSizes } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import BoardQuestionCard from "@/features/pubquizr/components/board/BoardQuestionCard";
import PreviousQuestion from "@/features/pubquizr/components/board/PreviousQuestion";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import SeatAvatar from "@/components/ui/SeatAvatar";
import type { ChoiceOption, HotSeatTurn, PreviousRuling } from "@/features/pubquizr/hot-seat";
import type { PQEmit, PQPick } from "@/features/pubquizr/multi-device/control";
import { seatAt, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    /** The frame draws the strip, so this board leaves it out. */
    bare?: boolean
    /** With a shared screen the options are on it, so this pad is four letters and nothing else. */
    letters?: boolean
    /** A settle is already in the air. */
    busy: boolean
    /** Says one thing about the question this phone is looking at. */
    emit: (frame: PQEmit) => void
    error: TranslationKey | null
    /** How many seats the question has already beaten, which is where in `turn.remaining` this phone sits. */
    missed: number
    // Called once, and only by the phone that ends the walk.
    onSettle: (missedSeats: number[], correctSeat: number | null, chosenAnswerId: string) => void
    /** Every pick taken on this question, whoever's phone took it. */
    picks: PQPick[]
    /** How the question before this one ended; only a phone with no shared screen shows it. */
    previous?: PreviousRuling | null
    /** The table, for naming whoever spent an option. Only the letters pad needs it. */
    seats?: Seat[]
    /** Which round this is, for the strip. */
    round: number
    turn: HotSeatTurn
}

// Round 2 on the answerer's own phone: four options, judged the instant one is tapped, because `correct` is already in the quiz every device holds.
export default function ChoicePadControl({ bare, busy, emit, error, letters = false, missed, onSettle, picks, previous = null, round, seats, turn }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    // Which option this phone spent, so a second tap cannot land while the settle is in the air.
    const [taken, setTaken] = useState<{ answerId: string | null, questionId: string | null }>({
        answerId: null,
        questionId: null
    });

    // Reset during render, like every other controller here. It emits nothing, because a frame from render is a side effect.
    if (taken.questionId !== turn.dealt.id) {
        setTaken({ answerId: null, questionId: turn.dealt.id });
    }

    const questionId = turn.dealt.id;
    const mine = taken.questionId === questionId ? taken.answerId : null;

    const answering = turn.remaining[missed] ?? turn.answering;
    const nextUp = turn.remaining[missed + 1] ?? null;
    // A run belongs to whoever is holding the seat, and round 2 never lets anybody hold it twice.
    const run = missed === 0 ? turn.run : 0;

    // Whatever an earlier seat already tried, which is no longer worth offering.
    const spent = new Set(picks.map(pick => pick.answerId));
    // Who burned each one, which the letters pad says out loud because the text is on the screen rather than here.
    const spentBy = new Map(picks.flatMap(pick => {
        const seat = seatAt(seats ?? [], pick.seat);

        return seat === null ? [] : [[pick.answerId, seat] as const];
    }));

    function pick(option: ChoiceOption) {
        if (busy || mine !== null || spent.has(option.id)) return;

        setTaken({ answerId: option.id, questionId });

        // Every pick on the question, always in full, so one frame is the whole card.
        emit({
            kind: 'pick',
            questionId,
            picks: [...picks, { answerId: option.id, correct: option.correct, seat: answering.seat }]
        });

        if (option.correct) {
            // Not cleared on unmount: the pick is already out, and only this phone can move the table on.
            setTimeout(() => onSettle(turn.remaining.slice(0, missed).map(seat => seat.seat), answering.seat, option.id), CORRECT_HOLD_MS);
            return;
        }

        if (nextUp !== null) {
            // The whole walk, always in full, so a lost frame is repaired by the next one.
            emit({
                kind: 'walk',
                questionId,
                answeringSeat: nextUp.seat,
                missedSeats: turn.remaining.slice(0, missed + 1).map(seat => seat.seat)
            });
            return;
        }

        // Nobody left to ask, so the phone that was wrong last is the one that says the question beat the table.
        onSettle(turn.remaining.map(seat => seat.seat), null, option.id);
    }

    return (
        <View style={styles.turn}>
            {/* Drawn here rather than by `ControlFrame`, because the walk this phone is on is its own local state. */}
            {!bare && (
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
            )}

            {letters ? (
                <AppText style={styles.cue}>{t('pubquizr.control.lettersCue')}</AppText>
            ) : (
                <BoardQuestionCard
                    cue={t('pubquizr.control.pickAnswer')}
                    number={null}
                    prompt={turn.question.prompt}
                    total={turn.total}
                    worth={turn.worth}
                />
            )}

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    message={t(error)}
                />
            )}

            <View style={styles.pad}>
                {turn.options.map(option => {
                    // The right answer stays lit rather than spent while the table takes it in.
                    const gone = spent.has(option.id) && !option.correct;
                    const judged = mine === option.id || (spent.has(option.id) && option.correct);

                    return (
                        <ChoiceOptionButton
                            key={option.id}
                            option={option}
                            letters={letters}
                            spentBy={spentBy.get(option.id) ?? null}
                            gone={gone}
                            judged={judged}
                            disabled={busy || mine !== null || gone}
                            onPress={() => pick(option)}
                            label={t('pubquizr.play.choice.spoken', {
                                letter: option.letter,
                                text: option.text
                            })}
                            styles={styles}
                        />
                    )
                })}
            </View>

            <TextHint
                text={nextUp === null
                    ? t('pubquizr.play.wrongEndsQuestion')
                    : t('pubquizr.play.wrongPassesTo', { name: nextUp.name })}
            />

            {previous !== null && <PreviousQuestion mySeat={answering.seat} previous={previous} />}
        </View>
    )
}

interface OptionButtonProps {
    option: ChoiceOption
    /** The letter alone, big enough to hit without looking, because the option's text is on the screen. */
    letters: boolean
    /** Who spent it, for the line under a letters pad. */
    spentBy: Seat | null
    gone: boolean
    judged: boolean
    disabled: boolean
    onPress: () => void
    label: string
    styles: ReturnType<typeof useStyles>
}

// Its own component so each option in the pad gets its own press/hover animation state.
function ChoiceOptionButton({ option, letters, spentBy, gone, judged, disabled, onPress, label, styles }: OptionButtonProps) {
    const pop = usePressPop();

    return (
        <AnimatedPressable
            disabled={disabled}
            onPress={onPress}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[
                styles.option,
                gone && styles.gone,
                judged && (option.correct ? styles.right : styles.wrong),
                pop.animatedStyle
            ]}
        >
            {letters ? (
                <AppText style={[styles.bigLetter, (judged || gone) && styles.onFill, gone && styles.struck]}>
                    {option.letter}
                </AppText>
            ) : (
                <>
                    <View style={styles.letter}>
                        <AppText style={[styles.letterText, (judged || gone) && styles.onFill]}>
                            {option.letter}
                        </AppText>
                    </View>

                    <AppText style={[styles.text, (judged || gone) && styles.onFill, gone && styles.struck]}>
                        {option.text}
                    </AppText>
                </>
            )}

            {letters && spentBy !== null && <SeatAvatar seat={spentBy} size={SPENT_AVATAR} />}
        </AnimatedPressable>
    )
}

const SPENT_AVATAR = 24;
const CORRECT_HOLD_MS = 3000;

const useStyles = createThemedStyles(theme => ({
    // The middle of the board grows and everything else does not.
    turn: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    pad: {
        flex: 1,
        minHeight: 0,
        gap: 10
    },

    cue: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: theme.colors.focus
    },

    // The letter carries the whole button when the option's text is on the screen instead.
    bigLetter: {
        flex: 1,
        fontSize: 44,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },

    // Every option is the same size, so the pad can be tapped without looking at it.
    option: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement,
        ...theme.shadows.hardSmall
    },

    // An option an earlier seat already tried, which is not a way to be wrong twice; blush under the fade reads as a quiet red.
    gone: {
        opacity: 0.4,
        backgroundColor: theme.colors.blush
    },

    struck: {
        textDecorationLine: 'line-through'
    },

    right: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    wrong: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.blush
    },

    letter: {
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },

    letterText: {
        fontSize: 15,
        fontWeight: 900,
        color: theme.colors.text
    },

    // `minWidth: 0` so a long option wraps inside the button instead of pushing the letter off it.
    text: {
        flex: 1,
        minWidth: 0,
        fontSize: 17,
        fontWeight: 800,
        lineHeight: 17 * 1.25,
        color: theme.colors.text
    },

    // Ink on mint and on blush alike, because both fills are the same in either scheme.
    onFill: {
        color: Brand.ink
    }
}))
