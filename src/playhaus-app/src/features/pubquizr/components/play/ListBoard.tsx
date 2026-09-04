import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { FontSizes, ShadowReach } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { ListAward } from "@/features/pubquizr/pubquizr-sessions";
import {
    LIST_SECONDS,
    scoreOfListAwards,
    unclaimedAnswers,
    ZEN_LIST_GUESSES,
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
import ScriptCard from "./ScriptCard";
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

/**
 * `preTimer` only ever sits between `ready` and `running` for a timed turn. Zen mode has
 * no clock to hold a beat in front of, so its `ready` screen goes straight to `running`.
 */
type Stage = 'ready' | 'preTimer' | 'running' | 'inTime' | 'bonus' | 'settle'

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

    const [turnOf, setTurnOf] = useState<string | null>(null);
    if (turnOf !== turn.dealt.id) {
        setTurnOf(turn.dealt.id);
        setStage('ready');
        setAwards({});
        setBonusIndex(0);
        setBonusPick(null);
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
                onStart={() => setStage(turn.guesses === null ? 'preTimer' : 'running')}
            />
        )
    }

    // A beat between the rules and the clock, for a timed turn only — zen mode has no
    // clock to hold this beat in front of, so its `ready` screen skips straight to
    // `running`. The question is read here, out loud, before anybody presses anything
    // that starts counting down: the twenty seconds are for the guesser to answer in, not
    // for the quizmaster to read the question against.
    if (stage === 'preTimer') {
        return (
            <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
                {strip}

                <ScriptCard prompt={turn.question.prompt} fills={false} />

                <AppText style={styles.recap}>
                    {t('pubquizr.play.list.preTimerHint', { guesser: turn.guesser.name })}
                </AppText>

                <ActionButton
                    size="large"
                    icon="play"
                    text={t('pubquizr.play.list.startTimer')}
                    onPress={() => setStage('running')}
                />
            </ScrollView>
        )
    }

    if (stage === 'running') {
        const rows = turn.answers.map(answer => (
            <PickRow
                key={answer.id}
                label={answer.text}
                active={(awards[answer.id] ?? null) !== null}
                disabled={busy}
                onPress={() => toggleInTime(answer.id)}
            />
        ));

        const hint = (
            <AppText style={styles.hint}>
                {t('pubquizr.play.onlyYouSeeThis')}
            </AppText>
        );

        const reminder = (
            <AppText style={styles.recap}>
                {t('pubquizr.play.list.runningReminder', { guesser: turn.guesser.name })}
            </AppText>
        );

        /*
         * Zen mode still gets a page of its own rather than sharing the timed layout
         * below it, but both now read the question out of the same full-size `ScriptCard`
         * round 2 uses, rather than the one-line recap this screen used to fold it into
         * once the clock was running.
         *
         * That card is also why the whole page scrolls here rather than just the rows.
         * With the question at full size the board can outgrow a short phone, and a
         * scroller around the rows alone answers that by squeezing the rows — which
         * leaves the reader tapping answers through a two-row window underneath a card
         * with room to spare. Scrolling the page keeps everything the size it should be
         * and puts the overflow where it belongs.
         */
        if (turn.guesses !== null) {
            return (
                <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
                    {strip}

                    <ScriptCard prompt={turn.question.prompt} fills={false} />

                    {/* The rule, said once and quietly. It was an `InlineNotification`,
                        which is a card — and a card is how this app says something that
                        has just happened and needs dealing with, not a standing fact
                        about the round. Given that much weight next to the question it
                        read as the more important of the two. */}
                    <TextHint
                        text={t('pubquizr.play.list.zenNotice', {
                            guesser: turn.guesser.name,
                            nGuesses: ZEN_LIST_GUESSES
                        })}
                    />

                    {hint}

                    <View style={styles.rowsColumn}>{rows}</View>

                    {reminder}

                    <ActionButton
                        size="large"
                        icon="arrow-right"
                        text={t('pubquizr.play.list.settle', { guesser: turn.guesser.name })}
                        disabled={busy}
                        onPress={() => setStage('inTime')}
                    />
                </ScrollView>
            )
        }

        return (
            <View style={styles.turn}>
                {strip}

                {/* `fills={false}` still carries a `flexGrow` — it is meant for the zen
                    page above, where the surrounding `ScrollView` has nothing else
                    competing for the leftover space. Here the rows below it want that
                    space instead, so the card is boxed in a plain, ungrowing wrapper: it
                    gets exactly its own content's height and nothing more. */}
                <View style={styles.question}>
                    <ScriptCard prompt={turn.question.prompt} fills={false} />
                </View>

                <ListTimerSlot key={turn.dealt.id} onDone={() => setStage('inTime')} />

                {hint}

                <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                    {rows}
                </ScrollView>

                {reminder}
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

function ListTimerSlot({ onDone }: { onDone: () => void }) {
    return <TurnTimer seconds={LIST_SECONDS} onDone={onDone} />;
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    // Sized to its content and nothing more, so `ScriptCard`'s own `flexGrow` has no
    // extra space to spend inside it — see the note where this wraps it.
    question: {
        flexShrink: 0
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

    // Zen mode's page, where the scroller is the board itself rather than a window on
    // the rows. `flexGrow` on the content so that a turn which does fit still fills the
    // window — without it the content container is content-height and everything bunches
    // up at the top with the question card refusing to grow into the room below it.
    page: {
        flex: 1,
        minHeight: 0
    },

    pageInner: {
        flexGrow: 1,
        gap: 12,
        paddingRight: ShadowReach.hardSmall,
        paddingVertical: 4
    },

    // The rows on that page: spacing only. The slack the pick rows' hard shadow needs is
    // the page's business now, and laying it down again here would inset the rows from
    // the question card above them by twice as much.
    rowsColumn: {
        gap: 10
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
