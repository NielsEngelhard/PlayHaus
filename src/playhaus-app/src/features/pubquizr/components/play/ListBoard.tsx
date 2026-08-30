import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Brand } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { ListAward } from "@/features/pubquizr/pubquizr-sessions";
import { LIST_SECONDS_PER_TURN, type ListTurn } from "@/features/pubquizr/round-five";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import DescribeTimer from "./DescribeTimer";
import QuestionRecap from "./QuestionRecap";
import ScriptCard from "./ScriptCard";
import TurnStrip from "./TurnStrip";

interface Props {
    turn: ListTurn
    /** Which round this is, for the strip's pips. */
    round: number
    /** The strip's one-line sentence, for the reading screen where nobody is answering yet. */
    lead: string
    busy: boolean
    error: TranslationKey | null
    onSettle: (awards: ListAward[]) => void
}

/** Where in the question we are. Three screens, the same split round 4's board makes. */
type Stage = 'reading' | 'guessing' | 'scoring'

/**
 * The board for round 5: one category, four answers, and the whole table taking turns
 * to call them out.
 *
 * Three screens rather than one. **Reading** is the question on its own, public and out
 * loud — this round has nothing to hide from the table, unlike the hot seat rounds'
 * covered answer, because the table is the one doing the guessing. **Guessing** is where
 * the four answers finally go on screen, one player's ten seconds at a time: tapping one
 * only marks it found, it does not say who found it, because the reader is watching the
 * table call things out and marking them as they land rather than working out credit on
 * the fly. **Scoring** is that last step, once the round has been all the way round the
 * table or the four answers have run out first — the same "settle it once, at the end"
 * shape round 4's award screen uses, and for the same reason: crediting people is a
 * decision worth a second look with the clock no longer running.
 */
export default function ListBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('reading');
    const [guesserIndex, setGuesserIndex] = useState(0);
    /**
     * Answer ids the reader has ticked off while the table calls them out.
     *
     * A helper for the reader's own eyes during play, nothing more — it decides when to
     * jump the round to scoring early (see `toggleFound`) and nothing else. It is never
     * read on the scoring screen itself: every answer is assignable there whether or not
     * it was ticked here, because a box left unchecked mid-round is not the same claim as
     * a table ruling nobody got it, and the two must not end up looking the same.
     */
    const [found, setFound] = useState<Set<string>>(new Set());
    /** Every seat named for an answer, or an empty array for one ruled nobody got. */
    const [awards, setAwards] = useState<Record<string, number[]>>({});
    /** Whether the category's been unfolded back out of the one-line recap. */
    const [rereading, setRereading] = useState(false);

    /*
     * Reset during render, the same way every other board here does: a new question has
     * to arrive with nothing found and nobody credited, in the same commit that brings
     * it — cleared afterwards, the board would paint once showing the last question's
     * answers under the new one's prompt.
     */
    const [turnOf, setTurnOf] = useState<string | null>(null);
    if (turnOf !== turn.dealt.id) {
        setTurnOf(turn.dealt.id);
        setStage('reading');
        setGuesserIndex(0);
        setFound(new Set());
        setAwards({});
        setRereading(false);
    }

    const guesser = turn.guessing[guesserIndex] ?? turn.guessing[turn.guessing.length - 1];

    /**
     * Marking the last answer is what ends the round, not a timer — checked off the
     * updater's own next value, so a rapid double tap toggles rather than double-adds,
     * and the stage changes in the same commit as the tap that caused it instead of the
     * board painting once more with a finished round still waiting on its clock.
     */
    function toggleFound(id: string) {
        setFound(current => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id); else next.add(id);

            if (next.size >= turn.answers.length) setStage('scoring');

            return next;
        });
    }

    /**
     * The current player's ten seconds are over, one way or another. Past the last
     * guesser, the round is done and the scoring screen is next — always, regardless of
     * what got checked off while the clock was running. See the note on `found` above:
     * crediting is a decision for the scoring screen alone, and skipping straight to a
     * no-credit settle here would let a reader's un-ticked box during play quietly decide
     * an assignment it was never meant to touch.
     */
    function nextGuesser() {
        const next = guesserIndex + 1;
        if (next < turn.guessing.length) {
            setGuesserIndex(next);
            return;
        }

        setStage('scoring');
    }

    /** Add or drop one seat from an answer's credits — a draw is more than one at once. */
    function toggleCredit(answerId: string, seat: number) {
        setAwards(current => {
            const named = current[answerId] ?? [];
            return {
                ...current,
                [answerId]: named.includes(seat)
                    ? named.filter(candidate => candidate !== seat)
                    : [...named, seat]
            };
        });
    }

    function markNobody(answerId: string) {
        setAwards(current => ({ ...current, [answerId]: [] }));
    }

    // Every answer has to be ruled on for scoring, found or not — see the note on
    // `found` above. A row left blank and a row marked "nobody" look the same on a
    // phone being passed round, and the difference between them is a point.
    const ruled = turn.answers.filter(answer => answer.id in awards).length;
    const ready = ruled === turn.answers.length;

    if (stage === 'reading') {
        return (
            <View style={styles.turn}>
                <TurnStrip
                    quizmaster={turn.quizmaster}
                    answering={null}
                    lead={lead}
                    run={0}
                    round={round}
                    number={turn.number}
                    total={turn.total}
                    worth={turn.worth}
                />

                <ScriptCard
                    prompt={turn.question.prompt}
                    cue={t('pubquizr.play.list.readCategory')}
                    size={26}
                >
                    <View style={styles.stake}>
                        <Feather name="award" size={13} color={Brand.ink} />

                        <AppText style={styles.stakeLabel}>
                            {t('pubquizr.play.list.perAnswer', { worth: turn.worth })}
                        </AppText>
                    </View>

                    <View style={styles.guessingRule}>
                        <AppText style={styles.guessingLabel}>
                            {t('pubquizr.play.list.turnOrder')}
                        </AppText>

                        <View style={styles.guessers}>
                            {turn.guessing.map(seat => (
                                <View
                                    key={seat.seat}
                                    style={[styles.guesser, { backgroundColor: seat.swatch.color }]}
                                    accessibilityRole="text"
                                    accessibilityLabel={seat.name}
                                >
                                    <AppText style={[styles.guesserInitials, { color: seat.swatch.foreground }]}>
                                        {seat.initials}
                                    </AppText>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScriptCard>

                <ActionButton
                    size="large"
                    icon="play"
                    text={t('pubquizr.play.list.start')}
                    onPress={() => setStage('guessing')}
                />
            </View>
        )
    }

    if (stage === 'guessing') {
        return (
            <View style={styles.turn}>
                <TurnStrip
                    quizmaster={turn.quizmaster}
                    answering={guesser}
                    lead={lead}
                    run={0}
                    round={round}
                    number={turn.number}
                    total={turn.total}
                    worth={turn.worth}
                />

                {/* The category, kept on screen for as long as the table is calling
                    answers out at it — a reader who has to leave this screen to remind
                    themselves what was asked is a reader who stops reading it out
                    again, and the table is still guessing off what it heard once. */}
                <QuestionRecap
                    prompt={turn.question.prompt}
                    icon="volume-2"
                    hint={t('pubquizr.play.reread')}
                    expanded={rereading}
                    onPress={() => setRereading(current => !current)}
                />

                <View style={styles.skipRow}>
                    <Pressable
                        onPress={nextGuesser}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={t('pubquizr.play.list.skip', { name: guesser.name })}
                        style={[styles.skip, busy && styles.dimmed]}
                    >
                        <AppText style={styles.skipText}>
                            {t('pubquizr.play.list.skip', { name: guesser.name })}
                        </AppText>

                        <Feather name="skip-forward" size={14} color={theme.colors.textMuted} />
                    </Pressable>
                </View>

                {/* Keyed to the guesser, so each one gets its own fresh ten seconds
                    instead of picking up wherever the last one's clock left off. */}
                <ListTimerSlot
                    key={`${turn.dealt.id}-${guesserIndex}`}
                    onDone={nextGuesser}
                />

                <AppText style={styles.hint}>
                    {t('pubquizr.play.onlyYouSeeThis')}
                </AppText>

                <ScrollView contentContainerStyle={styles.answers}>
                    {turn.answers.map(answer => {
                        const got = found.has(answer.id);

                        return (
                            <Pressable
                                key={answer.id}
                                onPress={() => toggleFound(answer.id)}
                                disabled={busy}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: got, disabled: busy }}
                                accessibilityLabel={answer.text}
                                style={[styles.answer, got && styles.answerFound, busy && styles.dimmed]}
                            >
                                <Feather
                                    name={got ? 'check-circle' : 'circle'}
                                    size={22}
                                    color={got ? Brand.ink : theme.colors.textMuted}
                                />

                                <AppText style={[styles.answerText, got && styles.answerTextFound]}>
                                    {answer.text}
                                </AppText>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                {error !== null && (
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        message={t(error)}
                    />
                )}
            </View>
        )
    }

    return (
        <View style={styles.turn}>
            <TurnStrip
                quizmaster={turn.quizmaster}
                answering={null}
                lead={lead}
                run={0}
                round={round}
                number={turn.number}
                total={turn.total}
                worth={turn.worth}
            />

            <AppText style={styles.title}>
                {t('pubquizr.play.list.scoringTitle')}
            </AppText>

            <AppText style={styles.recap}>
                {t('pubquizr.play.list.whoSaidItHint')}
            </AppText>

            <ScrollView
                style={styles.rows}
                contentContainerStyle={styles.rowsInner}
                keyboardShouldPersistTaps="handled"
            >
                {turn.answers.map(answer => {
                    const named = awards[answer.id] ?? [];
                    const nobody = answer.id in awards && named.length === 0;

                    return (
                        <View key={answer.id} style={styles.row}>
                            <AppText style={styles.rowAnswer} numberOfLines={1}>
                                {answer.text}
                            </AppText>

                            <View style={styles.chips}>
                                {turn.guessing.map(seat => {
                                    const active = named.includes(seat.seat);

                                    return (
                                        <Pressable
                                            key={seat.seat}
                                            onPress={() => toggleCredit(answer.id, seat.seat)}
                                            disabled={busy}
                                            accessibilityRole="checkbox"
                                            accessibilityState={{ checked: active, disabled: busy }}
                                            accessibilityLabel={seat.name}
                                            style={[
                                                styles.chip,
                                                active && styles.chipActive,
                                                busy && styles.dimmed
                                            ]}
                                        >
                                            <View style={[styles.chipAvatar, { backgroundColor: seat.swatch.color }]}>
                                                <AppText style={[styles.chipInitials, { color: seat.swatch.foreground }]}>
                                                    {seat.initials}
                                                </AppText>
                                            </View>

                                            <AppText
                                                style={[styles.chipText, active && styles.chipTextActive]}
                                                numberOfLines={1}
                                            >
                                                {seat.name}
                                            </AppText>

                                            {active && (
                                                <Feather name="check" size={13} color={Brand.ink} />
                                            )}
                                        </Pressable>
                                    )
                                })}

                                <Pressable
                                    onPress={() => markNobody(answer.id)}
                                    disabled={busy}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: nobody, disabled: busy }}
                                    accessibilityLabel={t('pubquizr.play.describe.nobody')}
                                    style={[
                                        styles.chip,
                                        styles.chipNobody,
                                        nobody && styles.chipNobodyActive,
                                        busy && styles.dimmed
                                    ]}
                                >
                                    <Feather
                                        name="x"
                                        size={14}
                                        color={nobody ? theme.colors.destructiveText : theme.colors.textMuted}
                                    />

                                    <AppText style={[styles.chipText, nobody && styles.chipNobodyText]}>
                                        {t('pubquizr.play.describe.nobody')}
                                    </AppText>
                                </Pressable>
                            </View>
                        </View>
                    )
                })}
            </ScrollView>

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    message={t(error)}
                />
            )}

            <ActionButton
                size="large"
                icon="award"
                text={ready
                    ? t('pubquizr.play.list.settle')
                    : t('pubquizr.play.list.stillToRule', { left: turn.answers.length - ruled })}
                disabled={!ready || busy}
                onPress={() => {
                    if (!ready || busy) return;

                    onSettle(turn.answers.map(answer => ({
                        answerId: answer.id,
                        seats: awards[answer.id] ?? []
                    })));
                }}
            />
        </View>
    )
}

/**
 * The timer, kept behind a component of its own so it mounts once per guesser — see
 * `DescribeTimerSlot`, which this mirrors for the same reason.
 */
function ListTimerSlot({ onDone }: { onDone: () => void }) {
    return <DescribeTimer seconds={LIST_SECONDS_PER_TURN} onDone={onDone} />;
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    /* Reading screen ------------------------------------------------------------ */

    stake: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 4,
        paddingHorizontal: 11,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint
    },

    stakeLabel: {
        fontSize: 11.5,
        fontWeight: 900,
        color: Brand.ink
    },

    guessingRule: {
        marginTop: 22,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: theme.colors.borderMuted
    },

    guessingLabel: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    guessers: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },

    guesser: {
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    guesserInitials: {
        fontSize: 12,
        fontWeight: 900
    },

    /* Guessing screen ------------------------------------------------------------ */

    // The skip button sits at the top right of its own row, apart from the strip: it is
    // a way to cut a turn short rather than a fact about it, and the strip already names
    // whose turn is being cut short.
    skipRow: {
        flexShrink: 0,
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },

    skip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    skipText: {
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    hint: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    answers: {
        gap: 10,
        paddingVertical: 4
    },

    answer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // Mint in both schemes, the same "this one" a right answer wears everywhere else.
    answerFound: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    answerText: {
        flex: 1,
        minWidth: 0,
        fontSize: 18,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },

    answerTextFound: {
        color: Brand.ink
    },

    /* Scoring screen --------------------------------------------------------------- */

    title: {
        flexShrink: 0,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    recap: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    rowsInner: {
        gap: 10,
        paddingBottom: 2
    },

    row: {
        gap: 8,
        padding: 13,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    rowAnswer: {
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    chips: {
        marginTop: 4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },

    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundInput
    },

    chipActive: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    chipAvatar: {
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center'
    },

    chipInitials: {
        fontSize: 9.5,
        fontWeight: 900
    },

    chipText: {
        fontSize: 13.5,
        fontWeight: 700,
        color: theme.colors.text
    },

    chipTextActive: {
        color: Brand.ink
    },

    chipNobody: {
        borderStyle: 'dashed'
    },

    chipNobodyActive: {
        borderStyle: 'solid',
        borderColor: theme.colors.destructive,
        backgroundColor: theme.colors.backgroundSecondary
    },

    chipNobodyText: {
        color: theme.colors.destructiveText
    },

    dimmed: {
        opacity: 0.5
    }
}))
