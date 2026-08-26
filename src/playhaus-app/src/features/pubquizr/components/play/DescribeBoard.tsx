import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import SelectInput, { type SelectOption } from "@/components/ui/SelectInput";
import { Brand } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import {
    DESCRIBE_SECONDS,
    scoreOfAwards,
    type DescribeTurn
} from "@/features/pubquizr/round-four";
import type { WordAward } from "@/features/pubquizr/pubquizr-sessions";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import DescribeTimer from "./DescribeTimer";

interface Props {
    turn: DescribeTurn
    busy: boolean
    error: TranslationKey | null
    onSettle: (awards: WordAward[]) => void
}

/** Where in the turn we are. Three screens, because they cannot share a phone. */
type Stage = 'ready' | 'running' | 'scoring';

/** The option value meaning "nobody got this one". */
const NOBODY = 'nobody';

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
export default function DescribeBoard({ turn, busy, error, onSettle }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [stage, setStage] = useState<Stage>('ready');
    const [awards, setAwards] = useState<Record<string, number | null>>({});

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

    const options: SelectOption<string>[] = [
        ...turn.guessers.map(seat => ({
            value: String(seat.seat),
            label: seat.name,
            icon: (
                <View style={[styles.swatch, { backgroundColor: seat.swatch.color }]}>
                    <AppText style={[styles.swatchText, { color: seat.swatch.foreground }]}>
                        {seat.initials}
                    </AppText>
                </View>
            )
        })),
        {
            value: NOBODY,
            label: t('pubquizr.play.describe.nobody'),
            icon: <Feather name="x" size={16} color={theme.colors.textMuted} />
        }
    ];

    if (stage === 'ready') {
        return (
            <View style={styles.turn}>
                <View style={styles.centre}>
                    <Feather name="eye-off" size={34} color={theme.colors.textMuted} />

                    <AppText style={styles.title}>
                        {t('pubquizr.play.describe.readyTitle', { name: turn.describer.name })}
                    </AppText>

                    <AppText style={styles.body}>
                        {t('pubquizr.play.describe.readyBody', {
                            words: turn.words.length,
                            seconds: DESCRIBE_SECONDS
                        })}
                    </AppText>
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
            </View>
        )
    }

    return (
        <View style={styles.turn}>
            <AppText style={styles.title}>
                {t('pubquizr.play.describe.scoringTitle')}
            </AppText>

            <ScrollView
                style={styles.rows}
                contentContainerStyle={styles.rowsInner}
                keyboardShouldPersistTaps="handled"
            >
                {turn.words.map(word => {
                    const chosen = word.dealt.id in awards
                        ? (awards[word.dealt.id] === null ? NOBODY : String(awards[word.dealt.id]))
                        : '';

                    return (
                        <View key={word.dealt.id} style={styles.row}>
                            <AppText style={styles.rowWord} numberOfLines={1}>
                                {word.word}
                            </AppText>

                            <SelectInput
                                variant="inline"
                                label={t('pubquizr.play.describe.whoGotIt', { word: word.word })}
                                value={chosen}
                                options={options}
                                disabled={busy}
                                onChange={value => setAwards(current => ({
                                    ...current,
                                    [word.dealt.id]: value === NOBODY ? null : Number(value)
                                }))}
                            />
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
                        seat: awards[word.dealt.id] ?? null
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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14
    },

    title: {
        flexShrink: 0,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    body: {
        maxWidth: 280,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 14 * 1.5,
        textAlign: 'center',
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
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
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
        gap: 6,
        padding: 11,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    rowWord: {
        fontSize: 15,
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

    swatch: {
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    swatchText: {
        fontSize: 9,
        fontWeight: 900
    }
}))
