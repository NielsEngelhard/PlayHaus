import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import { FontSizes, ShadowReach } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { ListAward } from "@/features/pubquizr/pubquizr-sessions";
import {
    LIST_SECONDS,
    scoreOfListAwards,
    unclaimedAnswers,
    type ListAwards,
    type ListTurn
} from "@/features/pubquizr/round-five";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import BonusRoundScreen from "./BonusRoundScreen";
import PickRow, { AwardRow } from "./PickRow";
import QuestionRecap from "./QuestionRecap";
import TurnRulesScreen, { type TurnRule } from "./TurnRulesScreen";
import TurnStrip from "./TurnStrip";
import TurnTimer from "./TurnTimer";

interface Props {
    turn: ListTurn
    round: number
    lead: string
    busy: boolean
    error: TranslationKey | null
    onSettle: (awards: ListAward[]) => void
}

type Stage = 'ready' | 'running' | 'inTime' | 'bonus' | 'settle'

export default function ListBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('ready');
    /** What became of each answer: the seat credited with it, or null for one nobody got. */
    const [awards, setAwards] = useState<ListAwards>({});
    /** Whose bonus guess is being offered, as an index into `turn.bonus`. */
    const [bonusIndex, setBonusIndex] = useState(0);
    /** The answer this player has been marked down for, before it is committed. */
    const [bonusPick, setBonusPick] = useState<string | null>(null);

    const [spent, setSpent] = useState(0);
    /** Whether the question has been unfolded back out of the one-line recap. */
    const [rereading, setRereading] = useState(false);

    const [turnOf, setTurnOf] = useState<string | null>(null);
    if (turnOf !== turn.dealt.id) {
        setTurnOf(turn.dealt.id);
        setStage('ready');
        setAwards({});
        setBonusIndex(0);
        setBonusPick(null);
        setSpent(0);
        setRereading(false);
    }

    const unclaimed = unclaimedAnswers(turn, awards);
    const standing = scoreOfListAwards(turn, awards);

    /** Credit an answer to one seat, or to nobody. */
    function credit(answerId: string, seat: number | null) {
        setAwards(current => ({ ...current, [answerId]: seat }));
    }

    function toggleInTime(answerId: string) {
        setAwards(current => {
            const next: ListAwards = {
                ...current,
                [answerId]: (current[answerId] ?? null) === null ? turn.guesser.seat : null
            };

            const left = turn.answers.filter(answer => (next[answer.id] ?? null) === null);
            if (left.length === 0) setStage('settle');

            return next;
        });
    }

    function tickWhileRunning(answerId: string) {
        if (turn.guesses === null) {
            toggleInTime(answerId);
            return;
        }

        const taking = (awards[answerId] ?? null) === null;
        const next: ListAwards = { ...awards, [answerId]: taking ? turn.guesser.seat : null };
        setAwards(next);

        const left = turn.answers.filter(answer => (next[answer.id] ?? null) === null);
        const after = Math.max(0, spent + (taking ? 1 : -1));
        setSpent(after);

        if (left.length === 0) setStage('settle');
        else if (after >= turn.guesses) setStage('inTime');
    }

    function missOne() {
        if (busy || turn.guesses === null) return;

        const after = spent + 1;
        setSpent(after);

        if (after >= turn.guesses) setStage('inTime');
    }

    function openBonus() {
        if (unclaimed.length === 0 || turn.bonus.length === 0) {
            setStage('settle');
            return;
        }

        setBonusIndex(0);
        setBonusPick(null);
        setStage('bonus');
    }

    function nextBonus(left: number) {
        setBonusPick(null);

        const next = bonusIndex + 1;
        if (left > 0 && next < turn.bonus.length) {
            setBonusIndex(next);
            return;
        }

        setStage('settle');
    }

    function spendBonus(player: Seat) {
        if (busy) return;

        if (bonusPick === null) {
            nextBonus(unclaimed.length);
            return;
        }

        credit(bonusPick, player.seat);
        nextBonus(unclaimed.length - 1);
    }

    const strip = (
        <TurnStrip
            quizmaster={turn.quizmaster}
            answering={turn.guesser}
            lead={lead}
            run={0}
            round={round}
            number={turn.number}
            total={turn.total}
            worth={turn.worth}
        />
    );

    if (stage === 'ready') {
        const rules: TurnRule[] = [
            {
                icon: 'user-check',
                text: t('pubquizr.play.list.readyRuleOnlyGuesser', { guesser: turn.guesser.name })
            },
            turn.guesses === null
                ? {
                    icon: 'clock',
                    text: t('pubquizr.play.list.readyRuleTime', {
                        seconds: LIST_SECONDS,
                        answers: turn.answers.length
                    })
                }
                : {
                    icon: 'target',
                    text: t('pubquizr.play.list.readyRuleGuesses', {
                        guesses: turn.guesses,
                        answers: turn.answers.length
                    })
                },
            { icon: 'eye-off', text: t('pubquizr.play.list.readyRuleHidden') },
            {
                icon: 'award',
                text: t('pubquizr.play.list.readyRuleScore', { worth: turn.worth })
            },
            {
                icon: 'users',
                text: t('pubquizr.play.list.readyRuleBonus', { others: turn.bonus.length })
            }
        ];

        return (
            <TurnRulesScreen
                strip={strip}
                quizmaster={turn.quizmaster}
                guesser={turn.guesser}
                rules={rules}
                action={t('pubquizr.play.list.start')}
                onStart={() => setStage('running')}
            />
        )
    }

    if (stage === 'running') {
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

                {turn.guesses === null
                    ? <ListTimerSlot key={turn.dealt.id} onDone={() => setStage('inTime')} />
                    : <GuessCounter spent={spent} total={turn.guesses} />}

                <AppText style={styles.hint}>
                    {t('pubquizr.play.onlyYouSeeThis')}
                </AppText>

                <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                    {turn.answers.map(answer => (
                        <PickRow
                            key={answer.id}
                            label={answer.text}
                            active={(awards[answer.id] ?? null) !== null}
                            disabled={busy}
                            onPress={() => tickWhileRunning(answer.id)}
                        />
                    ))}
                </ScrollView>

                <AppText style={styles.recap}>
                    {t('pubquizr.play.list.runningReminder', { guesser: turn.guesser.name })}
                </AppText>

                {turn.guesses !== null && (
                    <PopPressable
                        onPress={missOne}
                        disabled={busy}
                        accessibilityRole="button"
                        style={[styles.missed, busy && styles.dimmed]}
                    >
                        <Feather name="x" size={15} color={theme.colors.textMuted} />

                        <AppText style={styles.missedText}>
                            {t('pubquizr.play.list.missed')}
                        </AppText>
                    </PopPressable>
                )}

                {turn.guesses !== null && (
                    <ActionButton
                        size="large"
                        icon="arrow-right"
                        text={t('pubquizr.play.list.toInTime', { guesser: turn.guesser.name })}
                        disabled={busy}
                        onPress={() => setStage('inTime')}
                    />
                )}
            </View>
        )
    }

    if (stage === 'inTime') {
        return (
            <View style={styles.turn}>
                {strip}

                <AppText style={styles.title}>
                    {t('pubquizr.play.list.inTimeTitle', { guesser: turn.guesser.name })}
                </AppText>

                <AppText style={styles.recap}>
                    {t('pubquizr.play.list.inTimeHint', { guesser: turn.guesser.name })}
                </AppText>

                <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                    {turn.answers.map(answer => (
                        <PickRow
                            key={answer.id}
                            label={answer.text}
                            active={(awards[answer.id] ?? null) !== null}
                            disabled={busy}
                            onPress={() => toggleInTime(answer.id)}
                        />
                    ))}
                </ScrollView>

                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={unclaimed.length > 0 && turn.bonus.length > 0
                        ? t('pubquizr.play.list.toBonus', { left: unclaimed.length })
                        : t('pubquizr.play.list.toSettle')}
                    disabled={busy}
                    onPress={openBonus}
                />
            </View>
        )
    }

    if (stage === 'bonus') {
        const player = turn.bonus[bonusIndex];

        if (player === undefined || unclaimed.length === 0) {
            setStage('settle');
            return null;
        }

        return (
            <BonusRoundScreen
                strip={strip}
                player={player}
                index={bonusIndex}
                total={turn.bonus.length}
                options={unclaimed.map(answer => ({ id: answer.id, label: answer.text }))}
                picked={bonusPick}
                hint={t('pubquizr.play.list.bonusHint')}
                busy={busy}
                onPick={setBonusPick}
                onSpend={() => spendBonus(player)}
            />
        )
    }

    return (
        <View style={styles.turn}>
            {strip}

            <AppText style={styles.title}>
                {t('pubquizr.play.list.scoringTitle')}
            </AppText>

            <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                {turn.answers.map(answer => {
                    const credited = awards[answer.id] ?? null;
                    const winner = credited === null
                        ? null
                        : [turn.guesser, ...turn.bonus].find(seat => seat.seat === credited) ?? null;

                    return (
                        <AwardRow
                            key={answer.id}
                            label={answer.text}
                            winner={winner}
                            points={turn.worth}
                            nobody={t('pubquizr.play.turn.nobody')}
                        />
                    )
                })}
            </ScrollView>

            {/* What the question is about to be worth to the person who was asked it.
                Their total is the one worth showing: it is what the twenty seconds
                actually produced, and it is the number they will want to argue about. */}
            {standing.size > 0 && (
                <AppText style={styles.standing}>
                    {t('pubquizr.play.list.standing', {
                        name: turn.guesser.name,
                        points: standing.get(turn.guesser.seat) ?? 0
                    })}
                </AppText>
            )}

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    message={t(error)}
                />
            )}

            {/* The way back, because the scoring is a walk rather than a form: once the
                bonus has moved past a player there is no other way to undo a mis-tap, and
                one of them is a point somebody will notice. Back to `inTime`, not
                `running` — the clock already ran once, and re-running it would cost the
                table twenty seconds to fix a tap. */}
            <Pressable
                onPress={() => {
                    if (busy) return;
                    setAwards({});
                    setBonusIndex(0);
                    setBonusPick(null);
                    setStage('inTime');
                }}
                disabled={busy}
                accessibilityRole="button"
                style={[styles.again, busy && styles.dimmed]}
            >
                <Feather name="rotate-ccw" size={14} color={theme.colors.textMuted} />

                <AppText style={styles.againText}>
                    {t('pubquizr.play.list.scoreAgain')}
                </AppText>
            </Pressable>

            <ActionButton
                size="large"
                icon="award"
                text={t('pubquizr.play.list.settle')}
                disabled={busy}
                onPress={() => {
                    if (busy) return;

                    onSettle(turn.answers.map(answer => {
                        const credited = awards[answer.id] ?? null;
                        return {
                            answerId: answer.id,
                            seats: credited === null ? [] : [credited]
                        };
                    }));
                }}
            />
        </View>
    )
}

/**
 * The timer, kept behind a component of its own so it mounts once per question — see
 * `DescribeBoard`’s own slot, which this mirrors for the same reason: inlining it would put it
 * in the same tree as the awards state, and every tick on the answers would be a
 * re-render the countdown has to survive.
 */
function ListTimerSlot({ onDone }: { onDone: () => void }) {
    return <TurnTimer seconds={LIST_SECONDS} onDone={onDone} />;
}

function GuessCounter({ spent, total }: { spent: number, total: number }) {
    const t = useT();
    const styles = useStyles();

    const left = Math.max(0, total - spent);

    return (
        <View style={styles.counter}>
            <View style={styles.pips}>
                {Array.from({ length: total }, (_, index) => (
                    <View
                        key={index}
                        style={[styles.pip, index < spent && styles.pipSpent]}
                    />
                ))}
            </View>

            <AppText
                style={styles.counterLabel}
                accessibilityLiveRegion="polite"
            >
                {t('pubquizr.play.list.guessCounter', { left, total })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    title: {
        flexShrink: 0,
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    rowsInner: {
        gap: 10,
        // Room on the right for the hard shadow each pick row throws — a ScrollView
        // clips its own content box, and with no slack there the shadow's right edge
        // was the thing getting cut instead of cast.
        paddingRight: ShadowReach.hardSmall,
        paddingVertical: 4
    },

    hint: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    recap: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    standing: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.text
    },
    counter: {
        flexShrink: 0,
        alignItems: 'center',
        gap: 10
    },

    pips: {
        flexDirection: 'row',
        gap: 8
    },

    pip: {
        width: 26,
        height: 26,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.focus
    },
    pipSpent: {
        backgroundColor: theme.colors.backgroundElement
    },

    counterLabel: {
        fontSize: 13,
        fontWeight: 800,
        color: theme.colors.text
    },

    missed: {
        flexShrink: 0,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },

    missedText: {
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    again: {
        flexShrink: 0,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10
    },

    againText: {
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    dimmed: {
        opacity: 0.45
    }
}))
