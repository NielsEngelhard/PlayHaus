import type { FFGame, FFRound } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import BleedScrollView from "@/components/ui/BleedScrollView";
import PlayButton from "@/components/ui/PlayButton";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import TableProgress from "@/components/ui/TableProgress";
import WaitingStage from "@/components/ui/WaitingStage";
import { FAKE_FILLER } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import PromptLine from "@/features/fake-filler/components/play/PromptLine";
import { fillsComplete, normaliseFills, openPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";

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
        <BleedScrollView
            // The board is chromeless, so there is no page gutter to bleed into.
            bleed={0}
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
        </BleedScrollView>
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
                    placeholder={game.gameMode === 'definitions'
                        ? t('fakeFiller.play.writing.definitionPlaceholder')
                        : t('fakeFiller.play.writing.blankPlaceholder')}
                    blankLabel={position => t('fakeFiller.play.writing.blank', { index: position })}
                    disabled={busy}
                    size={size}
                    wide={game.gameMode === 'definitions'}
                />
            </SlideFadeIn>

            <View style={styles.foot}>
                {/* Said only once the player has asked to send, so it answers rather than warns. */}
                {tried && !complete && (
                    <AppText style={styles.problem}>
                        {t('fakeFiller.play.writing.incomplete')}
                    </AppText>
                )}

                <FFTableProgress game={game} />

                <PlayButton
                    game={FAKE_FILLER}
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

// The table, and how many answers are in.
function FFTableProgress({ game }: { game: FFGame }) {
    const t = useT();

    return (
        <TableProgress
            players={game.players}
            label={t('fakeFiller.play.writing.progress', { done: game.answersIn, total: game.answersNeeded })}
        />
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

            <FFTableProgress game={game} />
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
    }
}))
