import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { FontSizes } from "@/constants/theme";
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
import PickRow, { AwardRow } from "./PickRow";
import TurnTimer from "./TurnTimer";
import TurnRulesScreen, { type TurnRule } from "./TurnRulesScreen";
import TurnStrip from "./TurnStrip";

interface Props {
    turn: DescribeTurn
    /** Which round this is, for the strip's pips. */
    round: number
    /**
     * What the strip says when nobody in particular is being asked. Round 4 does have
     * somebody now — the seat on the describer's left — so `TurnStrip` draws the
     * two-person row and never reads this; it stays on the prop because the page hands
     * every board the same three lines and a round that quietly stopped taking one would
     * be a thing to rediscover.
     */
    lead: string
    busy: boolean
    error: TranslationKey | null
    onSettle: (awards: WordAward[]) => void
}

/**
 * Where in the turn we are.
 *
 * Five screens, because they cannot share a phone and because the turn is played in two
 * halves: the clock, which only the person on the describer's left is answering against,
 * and then the leftovers going round the rest of the table one guess each.
 */
type Stage = 'ready' | 'running' | 'inTime' | 'bonus' | 'settle';

/**
 * The board for round 4: your words, thirty seconds with the player on your left, and
 * then one guess each round the rest of the table for whatever is left over.
 *
 * The split into screens is not decoration. The words may only be seen by the person
 * describing them, so the first screen is a gate they have to close on purpose — the same
 * gate the hand-off is, one level in. The second is a stopwatch with the words on it and
 * nothing to press, because the person holding it is talking. Everything after it happens
 * with time already up and in front of everybody.
 *
 * The scoring is two screens rather than one, and that is the round's rule made into a
 * shape: `inTime` can credit nobody but the guesser, and `bonus` offers each remaining
 * player the words that survived them, once. Doing it on one screen would mean drawing
 * every seat against every word and then explaining, in words, why most of those taps are
 * not allowed — so instead the screen only ever offers the taps that are.
 */
export default function DescribeBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('ready');
    /** What became of each word: the seat credited with it, or null for one nobody got. */
    const [awards, setAwards] = useState<DescribeAwards>({});
    /** Whose bonus guess is being offered, as an index into `turn.bonus`. */
    const [bonusIndex, setBonusIndex] = useState(0);
    /**
     * The word this player has been marked down for, before it is committed.
     *
     * Tapping a word used to credit it and move to the next player in the same gesture,
     * which put the single most destructive tap on the screen — one guess spent, on
     * somebody else's behalf, with the screen already gone — under the same finger that
     * is scrolling the list. Now it selects, exactly like the in-time screen above it,
     * and the button at the bottom is the one thing that ends the player's go.
     */
    const [bonusPick, setBonusPick] = useState<string | null>(null);

    /*
     * Reset during render, like every other board here: a new turn has to arrive with its
     * words hidden again, in the same commit that brings it. Keyed on the describer,
     * because that is what a turn is in this round.
     */
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

    /**
     * The clock's half of the turn is ruled on. What is left goes round the table.
     *
     * Straight to the settle when there is nothing left to steal, or nobody to offer it
     * to: a bonus round with an empty pool is a screen that asks a person to look at
     * nothing and press on.
     */
    function openBonus() {
        if (unclaimed.length === 0 || turn.bonus.length === 0) {
            setStage('settle');
            return;
        }

        setBonusIndex(0);
        setBonusPick(null);
        setStage('bonus');
    }

    /**
     * One player's single guess is spent, taken or not. On to the next of them — or to
     * the settle, once the words have run out or everybody has had their go.
     *
     * `left` is passed in rather than read off `unclaimed`, because the seat that has
     * just taken a word is being credited in the same commit and the render this runs in
     * still has the old pool.
     */
    function nextBonus(left: number) {
        setBonusPick(null);

        const next = bonusIndex + 1;
        if (left > 0 && next < turn.bonus.length) {
            setBonusIndex(next);
            return;
        }

        setStage('settle');
    }

    /**
     * The marked-down word is spent, and the walk moves on — or the guess goes on
     * nothing, which is the common case for words that already beat somebody with a clock
     * running.
     *
     * `unclaimed.length - 1` for the same reason `nextBonus` takes the count at all: the
     * credit is going out in this commit and the render it happens in is still holding
     * the old pool.
     */
    function spendBonus(player: Seat) {
        if (busy) return;

        if (bonusPick === null) {
            nextBonus(unclaimed.length);
            return;
        }

        credit(bonusPick, player.seat);
        nextBonus(unclaimed.length - 1);
    }

    /*
     * The same strip every other round wears. Round 4 does have somebody being asked now
     * — the seat on the describer's left — so the strip says so, the way it does in the
     * rounds that are read to one person. On the stopwatch screen it is left off along
     * with everything else: that screen is thirty seconds with nothing to press.
     */
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
        // Written at the table rather than at the phone, and in the order the turn
        // happens in: who is playing, how long, what is not allowed, what it pays, and
        // then what happens after the clock stops. The two that name a person are the
        // point of the screen — this round used to be a room shouting at once, and a
        // table that half-remembers the old rule will play it that way again.
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
                <TurnTimerSlot onDone={() => setStage('inTime')} />

                <ScrollView contentContainerStyle={styles.words}>
                    {turn.words.map(word => (
                        <View key={word.dealt.id} style={styles.word}>
                            <AppText style={styles.wordText}>{word.word}</AppText>
                        </View>
                    ))}
                </ScrollView>

                <AppText style={styles.hint}>
                    {t('pubquizr.play.describe.dontSayIt')}
                </AppText>

                {/* The one rule worth a reminder mid-timer, and it is the one the round
                    changed: the describer is playing to one person, and the rest of the
                    table calling out is not the game any more. Everything else on the
                    ready screen is a decision made before this started. */}
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

        // A pool that has emptied under the walk, or a seat that is no longer at the
        // table: either way there is nothing to offer, so the screen does not open.
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

            {/* What the turn is about to be worth, while it can still be changed. The
                describer's own total is the one worth showing: it is the sum of everything
                that landed, and it is the number they will want to argue about. */}
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

            {/* The way back, because the two scoring screens are a walk rather than a
                form: once the bonus has moved past a player there is no other way to undo
                a mis-tap, and one of them is a point somebody will notice. */}
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

/**
 * The timer, kept behind a component of its own so it mounts once per turn.
 *
 * Inlining it would put it in the same tree as the awards state, and every keystroke on
 * the scoring screen would be a re-render the countdown has to survive. It does survive
 * them — it counts against a deadline — but the thirty seconds should not depend on that.
 */
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

    // The one line worth surfacing again once the timer starts, so it does not depend
    // on being remembered from a screen already left behind.
    recap: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    words: {
        gap: 10,
        paddingVertical: 4
    },

    // The one thing on this screen that has to be readable at arm's length, held at an
    // angle, by somebody who is also talking.
    word: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    wordText: {
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -1,
        textAlign: 'center',
        color: theme.colors.text
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
