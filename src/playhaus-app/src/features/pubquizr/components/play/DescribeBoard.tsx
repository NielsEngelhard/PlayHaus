import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { WordAward } from "@/features/pubquizr/pubquizr-sessions";
import {
    DESCRIBE_SECONDS,
    scoreOfAwards,
    type DescribeTurn
} from "@/features/pubquizr/round-four";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import DescribeTimer from "./DescribeTimer";
import TurnStrip from "./TurnStrip";

interface Props {
    turn: DescribeTurn
    /** Which round this is, for the strip's pips. */
    round: number
    /** What the strip says: this round asks nobody in particular. */
    lead: string
    busy: boolean
    error: TranslationKey | null
    onSettle: (awards: WordAward[]) => void
}

/** Where in the turn we are. Three screens, because they cannot share a phone. */
type Stage = 'ready' | 'running' | 'scoring';

/**
 * The board for round 4: your words, thirty seconds, and then who got what.
 *
 * Three screens rather than one, and the split is not decoration. The words may only be
 * seen by the person describing them, so the first screen is a gate they have to close on
 * purpose — the same gate the hand-off is, one level in. The second is a stopwatch with
 * the words on it and nothing to press, because the person holding it is talking. The
 * third is the scoring, which happens after time is up and in front of everybody.
 *
 * Every word has to be ruled on, including the ones nobody got. That is not bureaucracy:
 * a row left blank and a row marked "nobody" look the same on a phone being passed round,
 * and the difference between them is a point.
 */
export default function DescribeBoard({ turn, round, lead, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('ready');
    /** Every seat named for a word, or an empty array for a word ruled nobody got. */
    const [awards, setAwards] = useState<Record<string, number[]>>({});

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
    }

    const ruled = turn.words.filter(word => word.dealt.id in awards).length;
    const ready = ruled === turn.words.length;
    const standing = scoreOfAwards(turn, awards);

    /** Add or drop one seat from a word's winners — a draw is more than one at once. */
    function toggleGuesser(wordId: string, seat: number) {
        setAwards(current => {
            const named = current[wordId] ?? [];
            return {
                ...current,
                [wordId]: named.includes(seat)
                    ? named.filter(candidate => candidate !== seat)
                    : [...named, seat]
            };
        });
    }

    /** Nobody got it — clears any names already on the word. */
    function markNobody(wordId: string) {
        setAwards(current => ({ ...current, [wordId]: [] }));
    }

    /*
     * The same strip every other round wears, minus the two-person half of it — nobody is
     * being asked here. On the stopwatch screen it is left off along with everything else:
     * that screen is thirty seconds with nothing to press.
     */
    const strip = (
        <TurnStrip
            quizmaster={turn.describer}
            answering={null}
            lead={lead}
            run={0}
            round={round}
            number={turn.number}
            total={turn.total}
            worth={turn.worth}
        />
    );

    if (stage === 'ready') {
        const rules: { icon: keyof typeof Feather.glyphMap, text: string }[] = [
            {
                icon: 'clock',
                text: t('pubquizr.play.describe.readyRuleTime', {
                    seconds: DESCRIBE_SECONDS,
                    words: turn.words.length
                })
            },
            { icon: 'eye-off', text: t('pubquizr.play.describe.readyRuleNoSaying') },
            { icon: 'users', text: t('pubquizr.play.describe.readyRuleBothScore') },
            { icon: 'zap', text: t('pubquizr.play.describe.readyRuleTiming') }
        ];

        return (
            <View style={styles.turn}>
                {strip}

                <View style={styles.centre}>
                    <AppText style={styles.title}>
                        {t('pubquizr.play.describe.readyTitle', { name: turn.describer.name })}
                    </AppText>

                    <View style={styles.rules}>
                        {rules.map((rule, index) => (
                            <View key={index} style={styles.rule}>
                                <View style={styles.ruleIcon}>
                                    <Feather name={rule.icon} size={16} color={Brand.ink} />
                                </View>

                                <AppText style={styles.ruleText}>{rule.text}</AppText>
                            </View>
                        ))}
                    </View>
                </View>

                <ActionButton
                    size="large"
                    icon="play"
                    text={t('pubquizr.play.describe.start')}
                    onPress={() => setStage('running')}
                />
            </View>
        )
    }

    if (stage === 'running') {
        return (
            <View style={styles.turn}>
                <DescribeTimerSlot onDone={() => setStage('scoring')} />

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

                {/* The one rule worth a reminder mid-timer: everything else on the ready
                    screen is a decision made before this started, this is the one a
                    describer's own excitement is most likely to make them forget. */}
                <AppText style={styles.recap}>
                    {t('pubquizr.play.describe.runningReminder')}
                </AppText>
            </View>
        )
    }

    return (
        <View style={styles.turn}>
            {strip}

            <AppText style={styles.title}>
                {t('pubquizr.play.describe.scoringTitle')}
            </AppText>

            <AppText style={styles.recap}>
                {t('pubquizr.play.describe.whoGotItHint')}
            </AppText>

            <ScrollView
                style={styles.rows}
                contentContainerStyle={styles.rowsInner}
                keyboardShouldPersistTaps="handled"
            >
                {turn.words.map(word => {
                    const named = awards[word.dealt.id] ?? [];
                    const nobody = word.dealt.id in awards && named.length === 0;

                    return (
                        <View key={word.dealt.id} style={styles.row}>
                            <AppText style={styles.rowWord} numberOfLines={1}>
                                {word.word}
                            </AppText>

                            <View style={styles.chips}>
                                {turn.guessers.map(seat => {
                                    const active = named.includes(seat.seat);

                                    return (
                                        <Pressable
                                            key={seat.seat}
                                            onPress={() => toggleGuesser(word.dealt.id, seat.seat)}
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
                                    onPress={() => markNobody(word.dealt.id)}
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

            <ActionButton
                size="large"
                icon="award"
                text={ready
                    ? t('pubquizr.play.describe.settle')
                    : t('pubquizr.play.describe.stillToRule', {
                        left: turn.words.length - ruled
                    })}
                disabled={!ready || busy}
                onPress={() => {
                    if (!ready || busy) return;

                    onSettle(turn.words.map(word => ({
                        sessionQuestionId: word.dealt.id,
                        seats: awards[word.dealt.id] ?? []
                    })));
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
function DescribeTimerSlot({ onDone }: { onDone: () => void }) {
    return <DescribeTimer seconds={DESCRIBE_SECONDS} onDone={onDone} />;
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 14
    },

    centre: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22
    },

    title: {
        flexShrink: 0,
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    rules: {
        width: '100%',
        maxWidth: 320,
        gap: Spacing.two,        
    },

    rule: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Spacing.three,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    ruleIcon: {
        width: 30,
        height: 30,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: theme.colors.mint
    },

    ruleText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 700,
        lineHeight: 13.5 * 1.4,
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

    row: {
        gap: 8,
        padding: 13,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    rowWord: {
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    standing: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
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

    // Mint, the same "this one" every guess-scoring row in this app wears.
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
