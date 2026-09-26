import type { WWGame, WWRound, WWRoundAnswer } from "@/api/calls/witty-wars";
import AppText from "@/components/text/AppText";
import BigTextInput from "@/components/ui/BigTextInput";
import BleedScrollView from "@/components/ui/BleedScrollView";
import PlayButton from "@/components/ui/PlayButton";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import TableProgress from "@/components/ui/TableProgress";
import TextButton from "@/components/ui/TextButton";
import WaitingStage from "@/components/ui/WaitingStage";
import { WITTY_WARS } from "@/constants/games";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import PromptCard from "@/features/witty-wars/components/play/PromptCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    game: WWGame,
    // The prompts dealt to this player, in round order.
    rounds: WWRound[],
    // Which of them is on screen, owned by the board so the band can count it.
    at: number,
    onMove: (at: number) => void,
    busy: boolean,
    onSubmit: (answers: WWRoundAnswer[]) => Promise<boolean>
}

const PROMPT_SLIDE = 56;
const PROMPT_MS = 380;
const WAIT_RISE = 24;
const WAIT_MS = 420;

// The writing phase: one prompt at a time, every answer held here until the last one sends them all.
export default function WritingScreen({ game, rounds, at, onMove, busy, onSubmit }: Props) {
    const t = useT();
    const styles = useStyles();

    // Every draft, by round number, so stepping back to a prompt finds what was written in it.
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [tried, setTried] = useState(false);

    const sent = rounds.length > 0 && rounds.every(round => round.answered);
    const round = rounds[at];

    if (sent || round === undefined) {
        return (
            <BleedScrollView bleed={0} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <SlideFadeIn offsetY={WAIT_RISE} durationMs={WAIT_MS} style={styles.waiting}>
                    <WaitingStage
                        game={WITTY_WARS}
                        title={t('wittyWars.play.writing.waitingTitle')}
                        message={t('wittyWars.play.writing.waitingMessage')}
                    />

                    <TableProgress
                        players={game.players}
                        label={t('wittyWars.play.writing.progress', { done: game.answersIn, total: game.answersNeeded })}
                    />
                </SlideFadeIn>
            </BleedScrollView>
        )
    }

    const draft = drafts[round.number] ?? '';
    const blank = draft.trim().length === 0;
    const last = at === rounds.length - 1;

    async function next() {
        setTried(true);
        if (blank) return;

        setTried(false);
        if (!last) {
            onMove(at + 1);
            return;
        }

        // The one request of the whole phase.
        await onSubmit(rounds.map(dealt => ({ roundNumber: dealt.number, answer: (drafts[dealt.number] ?? '').trim() })));
    }

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
            {/* Keyed by the prompt, so the next one comes in like the next card off the deck. */}
            <SlideFadeIn key={round.id} offsetX={PROMPT_SLIDE} durationMs={PROMPT_MS} style={styles.stage}>
                <PromptCard line={round.line} />

                <BigTextInput
                    value={draft}
                    onChangeText={value => setDrafts(current => ({ ...current, [round.number]: value }))}
                    maxLength={game.maxAnswerLength}
                    placeholder={t('wittyWars.play.writing.placeholder')}
                    accessibilityLabel={t('wittyWars.play.writing.answerLabel')}
                    disabled={busy}
                    autoFocus
                    onSubmitEditing={() => void next()}
                />
            </SlideFadeIn>

            <View style={styles.foot}>
                {/* Said only once the player has asked to move on, so it answers rather than warns. */}
                {tried && blank && (
                    <AppText style={styles.problem}>{t('wittyWars.play.writing.empty')}</AppText>
                )}

                <TableProgress
                    players={game.players}
                    label={t('wittyWars.play.writing.progress', { done: game.answersIn, total: game.answersNeeded })}
                />

                <PlayButton
                    game={WITTY_WARS}
                    text={busy
                        ? t('common.busy')
                        : last ? t('wittyWars.play.writing.submit') : t('wittyWars.play.writing.next')}
                    icon={last ? 'send' : 'arrow-right'}
                    disabled={busy}
                    onPress={() => void next()}
                />

                {at > 0 && (
                    <TextButton
                        text={t('wittyWars.play.writing.previous')}
                        variant='muted'
                        disabled={busy}
                        onPress={() => onMove(at - 1)}
                    />
                )}
            </View>
        </BleedScrollView>
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
        marginTop: Spacing.two,
        gap: Spacing.three
    },
    foot: {
        marginTop: 'auto',
        paddingTop: Spacing.four,
        gap: Spacing.three
    },
    // Fills the scroll content, so the wait sits in the middle of the window.
    waiting: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.four
    },
    problem: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.destructiveText
    }
}))
