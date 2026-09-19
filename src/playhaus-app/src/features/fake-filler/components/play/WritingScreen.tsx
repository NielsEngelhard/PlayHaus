import type { FFGame, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import WaitingStage from "@/components/ui/WaitingStage";
import { FAKE_FILLER } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import PromptLine from "@/features/fake-filler/components/play/PromptLine";
import { fillsComplete, normaliseFills, openPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
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
    const styles = useStyles();

    const { at, done } = openPrompt(rounds);
    const round = rounds[at];

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            // The keyboard is up for most of this screen.
            keyboardShouldPersistTaps='handled'
        >
            {done || round === undefined ? (
                <WaitingOnTable game={game} />
            ) : (
                <PromptStage
                    // Keyed by the prompt, so a half-written draft goes with the prompt it belonged to.
                    key={round.id}
                    game={game}
                    round={round}
                    busy={busy}
                    onSubmit={onSubmit}
                />
            )}
        </ScrollView>
    )
}

interface StageProps {
    game: FFGame,
    round: FFRound,
    busy: boolean,
    onSubmit: (roundNumber: number, fills: string[]) => Promise<boolean>
}

// One prompt filling the screen, and whatever has been written into it so far.
function PromptStage({ game, round, busy, onSubmit }: StageProps) {
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
            {/* Keyed by the prompt above, so the second one comes in like the next card off the deck. */}
            <SlideFadeIn offsetX={PROMPT_SLIDE} durationMs={PROMPT_MS} style={styles.stage}>
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
            </SlideFadeIn>

            <View style={styles.foot}>
                {/* Said only once the player has asked to send, so it answers rather than warns. */}
                {tried && !complete && (
                    <AppText style={styles.problem}>
                        {t('fakeFiller.play.writing.incomplete')}
                    </AppText>
                )}

                <TableProgress game={game} />

                <PlayButton
                    text={busy ? t('common.busy') : t('fakeFiller.play.writing.submit')}
                    disabled={busy}
                    onPress={() => void submit()}
                />
            </View>
        </>
    )
}

const PROMPT_SLIDE = 56;
const PROMPT_MS = 380;

/** How far each swatch in the stack sits over the one before it. */
const STACK_OVERLAP = -7;
// Past this many the stack stops growing and starts counting.
const STACK_SHOWN = 4;

// The table, as a huddle of swatches, and how far along it is.
function TableProgress({ game }: { game: FFGame }) {
    const t = useT();
    const styles = useStyles();

    const shown = game.players.slice(0, STACK_SHOWN);
    const rest = game.players.length - shown.length;
    const label = t('fakeFiller.play.writing.progress', { done: game.answersIn, total: game.answersNeeded });

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

const WAIT_RISE = 24;
const WAIT_MS = 420;

// Both of yours are in and the game is waiting on somebody else.
function WaitingOnTable({ game }: { game: FFGame }) {
    const t = useT();
    const styles = useStyles();

    return (
        <SlideFadeIn offsetY={WAIT_RISE} durationMs={WAIT_MS} style={styles.waiting}>
            <WaitingStage
                game={FAKE_FILLER}
                title={t('fakeFiller.play.writing.waitingTitle')}
                message={t('fakeFiller.play.writing.waitingMessage')}
            />

            <TableProgress game={game} />
        </SlideFadeIn>
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
    stage: {
        marginTop: Spacing.two
    },
    // Everything that is not the prompt, pushed to the bottom of the window.
    foot: {
        marginTop: 'auto',
        paddingTop: Spacing.four,
        gap: Spacing.two + Spacing.one
    },
    // Fills the scroll content, so the wait sits in the middle of the window.
    waiting: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.four
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
