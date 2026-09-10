import type { FFGame, FFGamePlayer, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing, withAlpha } from "@/constants/theme";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import PromptLine from "@/features/fake-filler/components/play/PromptLine";
import { fillsComplete, normaliseFills } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { avatarColorById } from "@/utils/color-utils";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";

interface Props {
    game: FFGame,
    /** The two prompts dealt to this player. */
    rounds: FFRound[],
    busy: boolean,
    onSubmit: (roundNumber: number, fills: string[]) => Promise<boolean>
}

// The writing phase: one prompt at a time, the other one behind it.
export default function WritingScreen({ game, rounds, busy, onSubmit }: Props) {
    const t = useT();
    const styles = useStyles();

    // The screen sits on the first prompt still open; once both are in it holds on the last.
    const pending = rounds.findIndex(round => !round.answered);
    const at = pending === -1 ? rounds.length - 1 : pending;
    const round = rounds[at];

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            // The keyboard is up for most of this screen.
            keyboardShouldPersistTaps='handled'
        >
            {round === undefined ? (
                <WaitingOnTable />
            ) : (
                <>
                    <View style={styles.head}>
                        <AppText style={styles.kicker}>
                            {t('fakeFiller.play.writing.promptOf', {
                                index: at + 1,
                                total: rounds.length
                            })}
                        </AppText>

                        <View style={styles.pips}>
                            {rounds.map((one, index) => (
                                <Pip key={one.id} done={one.answered} here={index === at} />
                            ))}
                        </View>
                    </View>

                    {/* The one thing a first-time player has to be told, and only until they have done it once. */}
                    {pending === 0 && (
                        <AppText style={styles.lede}>{t('fakeFiller.play.writing.intro')}</AppText>
                    )}

                    <PromptStage
                        // Keyed by the prompt, so a half-written draft goes with the prompt it belonged to.
                        key={round.id}
                        game={game}
                        round={round}
                        done={pending === -1}
                        busy={busy}
                        onSubmit={onSubmit}
                    />
                </>
            )}
        </ScrollView>
    )
}

// One step of the two-prompt track.
function Pip({ done, here }: { done: boolean, here: boolean }) {
    const theme = useTheme();
    const styles = useStyles();

    const fill = done
        ? theme.colors.text
        : withAlpha(theme.colors.text, here ? 0.45 : 0.18);

    return <View style={[styles.pip, { backgroundColor: fill }]} />;
}

interface StageProps {
    game: FFGame,
    round: FFRound,
    /** Whether every prompt dealt to this player is in, which turns the screen into a wait. */
    done: boolean,
    busy: boolean,
    onSubmit: (roundNumber: number, fills: string[]) => Promise<boolean>
}

// One prompt filling the screen, and whatever has been written into it so far.
function PromptStage({ game, round, done, busy, onSubmit }: StageProps) {
    const t = useT();
    const styles = useStyles();

    // The draft, one entry per blank.
    const [fills, setFills] = useState<string[]>(() => (
        round.myFills ?? Array.from({ length: round.blanks }, () => '')
    ));
    const [tried, setTried] = useState(false);

    const complete = fillsComplete(fills, round.blanks);

    // A long prompt at the size the design is drawn at would run off a small phone.
    const { width } = useWindowDimensions();
    const size = width < 380 ? 22 : 26;

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
        <>
            <View style={styles.stage}>
                <PromptLine
                    line={round.line}
                    fills={round.answered ? (round.myFills ?? fills) : fills}
                    editable={!round.answered}
                    onChangeFill={change}
                    placeholder={t('fakeFiller.play.writing.blankPlaceholder')}
                    blankLabel={position => t('fakeFiller.play.writing.blank', { index: position })}
                    disabled={busy}
                    size={size}
                />
            </View>

            <View style={styles.foot}>
                {done ? (
                    <WaitingOnTable />
                ) : (
                    <>
                        {/* Said only once the player has asked to send, so it answers rather than warns. */}
                        {tried && !complete && (
                            <AppText style={styles.problem}>
                                {t('fakeFiller.play.writing.incomplete')}
                            </AppText>
                        )}

                        <TableProgress
                            players={game.players}
                            label={t('fakeFiller.play.writing.progress', {
                                done: game.answersIn,
                                total: game.answersNeeded
                            })}
                        />

                        <PlayButton
                            text={busy ? t('common.busy') : t('fakeFiller.play.writing.submit')}
                            disabled={busy}
                            onPress={() => void submit()}
                        />
                    </>
                )}
            </View>
        </>
    )
}

/** How far each swatch in the stack sits over the one before it. */
const STACK_OVERLAP = -7;
// Past this many the stack stops growing and starts counting.
const STACK_SHOWN = 4;

// The table, as a huddle of swatches, and how far along it is.
function TableProgress({ players, label }: { players: FFGamePlayer[], label: string }) {
    const styles = useStyles();

    const shown = players.slice(0, STACK_SHOWN);
    const rest = players.length - shown.length;

    return (
        <View style={styles.progress}>
            <View style={styles.stack}>
                {shown.map((player, index) => (
                    <View
                        key={player.userId}
                        style={[
                            styles.swatch,
                            { backgroundColor: avatarColorById(player.avatarColorId).color },
                            index > 0 && { marginLeft: STACK_OVERLAP }
                        ]}
                    />
                ))}
            </View>

            {rest > 0 && <AppText style={styles.progressText}>{'+' + rest}</AppText>}

            <AppText style={styles.progressText}>{label}</AppText>
        </View>
    )
}

// Both of yours are in and the game is waiting on somebody else.
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

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },
    // Grows to the window, so the send button sits at the foot of a short prompt and below a long one.
    content: {
        flexGrow: 1,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.four,
        gap: Spacing.two
    },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    kicker: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    pips: {
        flexDirection: 'row',
        gap: Spacing.one
    },
    pip: {
        width: 18,
        height: 5,
        borderRadius: 999
    },
    lede: {
        fontSize: 12.5,
        lineHeight: 12.5 * 1.5,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },
    stage: {
        marginTop: Spacing.two
    },
    // Everything that is not the prompt, pushed to the bottom of the window.
    foot: {
        marginTop: 'auto',
        paddingTop: Spacing.four,
        gap: Spacing.two + Spacing.one
    },
    problem: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.destructiveText
    },
    progress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    stack: {
        flexDirection: 'row'
    },
    // Ringed in the page's own colour, so the swatches read as stacked rather than as touching.
    swatch: {
        width: 20,
        height: 20,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.background
    },
    // Tabular, so the left-hand digit does not twitch as answers land.
    progressText: {
        flexShrink: 1,
        fontSize: 11.5,
        fontWeight: 700,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    }
}))
