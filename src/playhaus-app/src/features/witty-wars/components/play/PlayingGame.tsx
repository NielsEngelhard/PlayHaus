import { wwRoundOf } from "@/api/calls/witty-wars";
import LoadingPage from "@/components/layout/LoadingPage";
import Confetti from "@/components/ui/Confetti";
import InlineNotification from "@/components/ui/InlineNotification";
import PlayBand from "@/components/ui/PlayBand";
import { WITTY_WARS } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import VotingScreen, { wonRound } from "@/features/witty-wars/components/play/VotingScreen";
import WritingScreen from "@/features/witty-wars/components/play/WritingScreen";
import type { WWGameState } from "@/features/witty-wars/useGame";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    table: WWGameState,
    userId: string,
    // The way out of the board, which is the room's leave confirm.
    onClose: () => void,
    // The last round has been read; the room shows the result instead.
    onFinish: () => void
}

// The board: which of the game's screens this player is on, and the band above it.
export default function PlayingGame({ table, userId, onClose, onFinish }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { game, reveal, votingRound, myRounds, actionError } = table;

    // Which of this player's prompts is on screen during the writing phase.
    const [writingAt, setWritingAt] = useState(0);

    if (table.error !== null) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('wittyWars.play.noGame')}
                    message={t(table.error)}
                />
            </View>
        )
    }

    if (game === null) {
        return <LoadingPage message={t('wittyWars.play.loading')} />;
    }

    // The round the band is counting, which is not always the one the game is on.
    const at = reveal?.roundNumber ?? game.currentRound;
    const roundCount = {
        at,
        total: game.totalRounds,
        spoken: t('wittyWars.play.voting.roundOf', { round: at, total: game.totalRounds })
    };

    const written = myRounds.length > 0 && myRounds.every(round => round.answered);
    const prompt = Math.min(writingAt, Math.max(myRounds.length - 1, 0));

    // The reveal is drawn on the voting round's own cards, so both phases show the same round.
    const round = reveal !== null ? wwRoundOf(game, reveal.roundNumber) ?? null : votingRound;

    // True only while a reveal is showing and this viewer's own answer won it.
    const wonReveal = reveal !== null && round !== null
        && (round.options ?? []).some(option => wonRound(round, option) && (option.authorIds ?? []).includes(userId));

    const band = reveal !== null ? {
        label: t('wittyWars.play.band.round'),
        count: roundCount,
        title: t('wittyWars.play.reveal.title')
    } : game.phase === 'writing' ? {
        label: t('wittyWars.play.band.prompt'),
        count: myRounds.length === 0 || written ? undefined : {
            at: prompt + 1,
            total: myRounds.length,
            spoken: t('wittyWars.play.writing.promptOf', { index: prompt + 1, total: myRounds.length })
        },
        title: t('wittyWars.play.writing.title'),
        // Only on the first prompt, before anything has been sent.
        subtitle: prompt === 0 && !written ? t('wittyWars.play.writing.intro') : undefined
    } : {
        label: t('wittyWars.play.band.round'),
        count: roundCount,
        title: t('wittyWars.play.voting.title'),
        subtitle: votingRound?.canVote === true ? t('wittyWars.play.voting.hint') : undefined
    };

    return (
        <View style={styles.page}>
            <PlayBand game={WITTY_WARS} onClose={onClose} closeLabel={t('lobby.leave')} {...band} />

            {actionError !== null && (
                <View style={styles.notice}>
                    <InlineNotification
                        icon='alert-triangle'
                        color={theme.colors.blush}
                        title={t('common.failed')}
                        message={t(actionError)}
                    />
                </View>
            )}

            {game.phase === 'writing' ? (
                <WritingScreen
                    game={game}
                    rounds={myRounds}
                    at={prompt}
                    onMove={setWritingAt}
                    busy={table.submitting}
                    onSubmit={table.submitAnswers}
                />
            ) : round !== null ? (
                <VotingScreen
                    // Keyed by the round, so the reveal updates these cards in place and the next round starts fresh.
                    key={round.id}
                    game={game}
                    round={round}
                    userId={userId}
                    busy={table.voting}
                    onVote={table.castVote}
                    more={round.number < game.totalRounds}
                    // The pacing is the host's; everybody else waits to be moved.
                    isHost={game.ownerId === userId}
                    advancing={table.advancing}
                    onContinue={() => {
                        void table.advance().then(moved => {
                            if (moved && round.number >= game.totalRounds) onFinish();
                        });
                    }}
                />
            ) : (
                <LoadingPage message={t('wittyWars.results.loading')} />
            )}

            {/* Last, so it falls in front of everything. */}
            <Confetti active={wonReveal} />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    page: {
        flex: 1,
        width: '100%'
    },
    notice: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three
    },
    // The board draws its own gutters: this page is chromeless, so it is handed the bare window.
    failed: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four
    }
}))
