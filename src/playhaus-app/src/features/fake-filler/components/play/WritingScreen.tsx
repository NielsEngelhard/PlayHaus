import type { FFGame, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { Spacing } from "@/constants/theme";
import PromptLine from "@/features/fake-filler/components/play/PromptLine";
import { fillsComplete, normaliseFills } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { ScrollView, View } from "react-native";

interface Props {
    game: FFGame,
    /** The two prompts dealt to this player. */
    rounds: FFRound[],
    busy: boolean,
    onSubmit: (roundNumber: number, fills: string[]) => Promise<boolean>
}

/**
 * The writing phase: your two prompts, in whatever order you like.
 *
 * Both at once rather than one after the other, because that is what the server is doing
 * — every round is open through the whole of this phase and nothing is waiting on the
 * order you fill them in. A wizard would invent a sequence the game does not have.
 *
 * What the table is told while this happens is a count and nothing else, which is the
 * whole of what this phase hides. The progress line at the bottom is that count; there is
 * deliberately nothing on this screen that could say what anybody wrote.
 */
export default function WritingScreen({ game, rounds, busy, onSubmit }: Props) {
    const t = useT();
    const styles = useStyles();

    const done = rounds.every(round => round.answered);

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            // The keyboard is up for most of this screen, and a tap on the page behind it
            // should reach the button rather than only dismiss it.
            keyboardShouldPersistTaps='handled'
        >
            {done ? (
                <WaitingOnTable />
            ) : (
                <View style={styles.intro}>
                    <AppText style={styles.title}>{t('fakeFiller.play.writing.title')}</AppText>

                    <AppText style={styles.lede}>{t('fakeFiller.play.writing.intro')}</AppText>
                </View>
            )}

            {rounds.map((round, at) => (
                <PromptCard
                    key={round.id}
                    round={round}
                    position={at + 1}
                    total={rounds.length}
                    busy={busy}
                    onSubmit={onSubmit}
                />
            ))}

            <AppText style={styles.progress}>
                {t('fakeFiller.play.writing.progress', {
                    done: game.answersIn,
                    total: game.answersNeeded
                })}
            </AppText>
        </ScrollView>
    )
}

/**
 * Both of yours are in and the game is waiting on somebody else.
 *
 * Worth saying plainly, because there is no clock in this game: nothing times out and
 * nothing is forfeited, so a table that has stopped moving has stopped on a person rather
 * than on a bug, and a screen that only sat there would look broken.
 */
function WaitingOnTable() {
    const t = useT();
    const theme = useTheme();

    return (
        <InlineNotification
            icon='clock'
            color={theme.colors.lemon}
            title={t('fakeFiller.play.writing.waitingTitle')}
            message={t('fakeFiller.play.writing.waitingMessage')}
        />
    )
}

interface PromptCardProps {
    round: FFRound,
    position: number,
    total: number,
    busy: boolean,
    onSubmit: (roundNumber: number, fills: string[]) => Promise<boolean>
}

/**
 * One prompt, and the state of this player's answer to it.
 *
 * Locked once sent, with a way back out: the server refuses a second answer to the same
 * prompt (`already_answered`), so "change it" reopens the fields locally and would be
 * refused — which is why it is not offered once the answer has actually landed. What it
 * is there for is the moment before, when the fields are filled and nothing has been
 * sent.
 */
function PromptCard({ round, position, total, busy, onSubmit }: PromptCardProps) {
    const t = useT();
    const styles = useStyles();

    /**
     * The draft, one entry per blank.
     *
     * Seeded from `myFills` so a reconnect redraws an answer already given rather than an
     * empty prompt — the server echoes it back on every read for exactly this.
     */
    const [fills, setFills] = useState<string[]>(() => (
        round.myFills ?? Array.from({ length: round.blanks }, () => '')
    ));
    const [tried, setTried] = useState(false);

    const complete = fillsComplete(fills, round.blanks);

    function change(index: number, value: string) {
        setFills(current => {
            const next = [...current];
            next[index] = value;
            return next;
        });
    }

    async function submit() {
        setTried(true);
        if (!complete) return;

        await onSubmit(round.number, normaliseFills(fills));
    }

    return (
        <Card style={styles.card}>
            <View style={styles.cardHead}>
                <AppText style={styles.kicker}>
                    {t('fakeFiller.play.writing.promptOf', { index: position, total })}
                </AppText>

                {round.answered && (
                    <View style={styles.lockedTag}>
                        <Feather name='check' size={12} color={styles.lockedTagText.color as string} />

                        <AppText style={styles.lockedTagText}>
                            {t('fakeFiller.play.writing.locked')}
                        </AppText>
                    </View>
                )}
            </View>

            <PromptLine
                line={round.line}
                fills={round.answered ? (round.myFills ?? fills) : fills}
                editable={!round.answered}
                onChangeFill={change}
                placeholder={t('fakeFiller.play.writing.blankPlaceholder')}
                blankLabel={at => t('fakeFiller.play.writing.blank', { index: at })}
                disabled={busy}
            />

            {!round.answered && (
                <View style={styles.action}>
                    {tried && !complete && (
                        <AppText style={styles.problem}>
                            {t('fakeFiller.play.writing.incomplete')}
                        </AppText>
                    )}

                    <TextButton
                        text={busy ? t('common.busy') : t('fakeFiller.play.writing.submit')}
                        variant='primary'
                        fullWidth
                        disabled={busy}
                        onPress={() => void submit()}
                    />
                </View>
            )}
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.five,
        gap: Spacing.three
    },
    intro: {
        gap: 6
    },
    title: {
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    lede: {
        fontSize: 13.5,
        lineHeight: 13.5 * 1.5,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },
    card: {
        gap: Spacing.three
    },
    cardHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    kicker: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    lockedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: theme.colors.backgroundSecondary
    },
    lockedTagText: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.available
    },
    action: {
        gap: Spacing.two
    },
    problem: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.destructive
    },
    // Tabular, so the left-hand digit does not twitch as answers land.
    progress: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 800,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    }
}))
