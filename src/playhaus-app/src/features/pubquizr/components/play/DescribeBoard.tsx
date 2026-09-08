import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Brand, FontSizes, ShadowReach } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { WordAward } from "@/features/pubquizr/pubquizr-sessions";
import {
    DESCRIBE_SECONDS,
    scoreOfAwards,
    unclaimedWords,
    type DescribeAwards,
    type DescribeTurn
} from "@/features/pubquizr/round-four";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import BonusRoundScreen from "./BonusRoundScreen";
import PickRow, { AwardRow } from "@/components/ui/PickRow";
import TurnTimer from "./TurnTimer";
import TurnRulesScreen, { type TurnRule } from "./TurnRulesScreen";
import TurnStrip from "./TurnStrip";

interface Props {
    turn: DescribeTurn
    /** Which round this is, for the strip's pips. */
    round: number
    // What the strip says when nobody in particular is being asked.
    lead: string
    busy: boolean
    error: TranslationKey | null
    onSettle: (awards: WordAward[]) => void
}

// Where in the turn we are.
type Stage = 'ready' | 'running' | 'inTime' | 'bonus' | 'settle';

// The board for round 4: your words, thirty seconds with the player on your left.
export default function DescribeBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('ready');
    /** What became of each word: the seat credited with it, or null for one nobody got. */
    const [awards, setAwards] = useState<DescribeAwards>({});
    /** Whose bonus guess is being offered, as an index into `turn.bonus`. */
    const [bonusIndex, setBonusIndex] = useState(0);
    // The word this player has been marked down for, before it is committed.
    const [bonusPick, setBonusPick] = useState<string | null>(null);

    // Reset during render, like every other board here.
    const [turnOf, setTurnOf] = useState<number | null>(null);
    if (turnOf !== turn.describer.seat) {
        setTurnOf(turn.describer.seat);
        setStage('ready');
        setAwards({});
        setBonusIndex(0);
        setBonusPick(null);
    }

    const unclaimed = unclaimedWords(turn, awards);
    const standing = scoreOfAwards(turn, awards);

    /** Credit a word to one seat, or to nobody. */
    function credit(wordId: string, seat: number | null) {
        setAwards(current => ({ ...current, [wordId]: seat }));
    }

    /** Did the guesser get this one inside the clock? Only they can be named here. */
    function toggleInTime(wordId: string) {
        setAwards(current => ({
            ...current,
            [wordId]: (current[wordId] ?? null) === null ? turn.guesser.seat : null
        }));
    }

    // The clock's half of the turn is ruled on.
    function openBonus() {
        if (unclaimed.length === 0 || turn.bonus.length === 0) {
            setStage('settle');
            return;
        }

        setBonusIndex(0);
        setBonusPick(null);
        setStage('bonus');
    }

    // One player's single guess is spent, taken or not.
    function nextBonus(left: number) {
        setBonusPick(null);

        const next = bonusIndex + 1;
        if (left > 0 && next < turn.bonus.length) {
            setBonusIndex(next);
            return;
        }

        setStage('settle');
    }

    // The marked-down word is spent, and the walk moves on.
    function spendBonus(player: Seat) {
        if (busy) return;

        if (bonusPick === null) {
            nextBonus(unclaimed.length);
            return;
        }

        credit(bonusPick, player.seat);
        nextBonus(unclaimed.length - 1);
    }

    // The same strip every other round wears, across every stage of this one — including the stopwatch.
    const strip = (
        <TurnStrip
            quizmaster={turn.describer}
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
        // Written at the table rather than at the phone, and in the order the turn happens in.
        const rules: TurnRule[] = [
            {
                icon: 'user-check',
                text: t('pubquizr.play.describe.readyRuleOnlyGuesser', {
                    guesser: turn.guesser.name
                })
            },
            {
                icon: 'clock',
                text: t('pubquizr.play.describe.readyRuleTime', {
                    seconds: DESCRIBE_SECONDS,
                    words: turn.words.length
                })
            },
            { icon: 'eye-off', text: t('pubquizr.play.describe.readyRuleNoSaying') },
            {
                icon: 'award',
                text: t('pubquizr.play.describe.readyRuleBothScore', {
                    guesser: turn.guesser.name
                })
            },
            {
                icon: 'users',
                text: t('pubquizr.play.describe.readyRuleBonus', {
                    others: turn.bonus.length
                })
            }
        ];

        return (
            <TurnRulesScreen
                strip={strip}
                quizmaster={turn.describer}
                guesser={turn.guesser}
                rules={rules}
                action={t('pubquizr.play.describe.start')}
                onStart={() => setStage('running')}
            />
        )
    }

    if (stage === 'running') {
        return (
            <View style={styles.turn}>
                {strip}

                <TurnTimerSlot onDone={() => setStage('inTime')} />

                <ScrollView contentContainerStyle={styles.words}>
                    {turn.words.map(word => {
                        const guessed = (awards[word.dealt.id] ?? null) !== null;

                        return (
                            <Pressable
                                key={word.dealt.id}
                                onPress={() => toggleInTime(word.dealt.id)}
                                disabled={busy}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: guessed, disabled: busy }}
                                accessibilityLabel={word.word}
                                style={[styles.word, guessed && styles.wordGuessed, busy && styles.dimmed]}
                            >
                                <AppText style={[styles.wordText, guessed && styles.wordTextGuessed]}>
                                    {word.word}
                                </AppText>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <AppText style={styles.hint}>
                    {t('pubquizr.play.describe.dontSayIt')}
                </AppText>

                {/* The one rule worth a reminder mid-timer, and it is the one the round changed. */}
                <AppText style={styles.recap}>
                    {t('pubquizr.play.describe.runningReminder', { guesser: turn.guesser.name })}
                </AppText>
            </View>
        )
    }

    if (stage === 'inTime') {
        return (
            <View style={styles.turn}>
                {strip}

                <AppText style={styles.title}>
                    {t('pubquizr.play.describe.inTimeTitle', { guesser: turn.guesser.name })}
                </AppText>

                <AppText style={styles.recap}>
                    {t('pubquizr.play.describe.inTimeHint', { guesser: turn.guesser.name })}
                </AppText>

                <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                    {turn.words.map(word => (
                        <PickRow
                            key={word.dealt.id}
                            label={word.word}
                            active={(awards[word.dealt.id] ?? null) !== null}
                            disabled={busy}
                            onPress={() => toggleInTime(word.dealt.id)}
                        />
                    ))}
                </ScrollView>

                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={unclaimed.length > 0 && turn.bonus.length > 0
                        ? t('pubquizr.play.describe.toBonus', { left: unclaimed.length })
                        : t('pubquizr.play.describe.toSettle')}
                    disabled={busy}
                    onPress={openBonus}
                />
            </View>
        )
    }

    if (stage === 'bonus') {
        const player = turn.bonus[bonusIndex];

        // A pool that has emptied under the walk, or a seat that is no longer at the table.
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
                options={unclaimed.map(word => ({ id: word.dealt.id, label: word.word }))}
                picked={bonusPick}
                hint={t('pubquizr.play.describe.bonusHint')}
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
                {t('pubquizr.play.describe.scoringTitle')}
            </AppText>

            <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                {turn.words.map(word => {
                    const credited = awards[word.dealt.id] ?? null;
                    const winner = credited === null
                        ? null
                        : [turn.guesser, ...turn.bonus].find(seat => seat.seat === credited) ?? null;

                    return (
                        <AwardRow
                            key={word.dealt.id}
                            label={word.word}
                            winner={winner}
                            points={turn.worth}
                            nobody={t('pubquizr.play.turn.nobody')}
                        />
                    )
                })}
            </ScrollView>

            {/* What the turn is about to be worth, while it can still be changed. */}
            {standing.size > 0 && (
                <AppText style={styles.standing}>
                    {t('pubquizr.play.describe.standing', {
                        name: turn.describer.name,
                        points: standing.get(turn.describer.seat) ?? 0
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

            {/* The way back, because the two scoring screens are a walk rather than a form. */}
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
                    {t('pubquizr.play.describe.scoreAgain')}
                </AppText>
            </Pressable>

            <ActionButton
                size="large"
                icon="award"
                text={t('pubquizr.play.describe.settle')}
                disabled={busy}
                onPress={() => {
                    if (busy) return;

                    onSettle(turn.words.map(word => {
                        const credited = awards[word.dealt.id] ?? null;
                        return {
                            sessionQuestionId: word.dealt.id,
                            seats: credited === null ? [] : [credited]
                        };
                    }));
                }}
            />
        </View>
    )
}

// The timer, kept behind a component of its own so it mounts once per turn.
function TurnTimerSlot({ onDone }: { onDone: () => void }) {
    return <TurnTimer seconds={DESCRIBE_SECONDS} onDone={onDone} />;
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 14
    },

    title: {
        flexShrink: 0,
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    // The one line worth surfacing again once the timer starts.
    recap: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    words: {
        gap: 10,
        paddingRight: ShadowReach.hardSmall,
        paddingVertical: 4
    },

    // The one thing on this screen that has to be readable at arm's length, held at an angle, by somebody who is also talking.
    word: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    wordGuessed: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    wordText: {
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -1,
        textAlign: 'center',
        color: theme.colors.text
    },

    wordTextGuessed: {
        color: Brand.ink,
        textDecorationLine: 'line-through'
    },

    hint: {
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
        paddingRight: ShadowReach.hardSmall,
        paddingBottom: 2
    },

    standing: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    again: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7
    },

    againText: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    dimmed: {
        opacity: 0.5
    }
}))
