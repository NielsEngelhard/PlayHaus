import LoadingPage from "@/components/layout/LoadingPage";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import PlayBand from "@/features/fake-filler/components/play/PlayBand";
import RoundRevealScreen from "@/features/fake-filler/components/play/RoundRevealScreen";
import VotingScreen from "@/features/fake-filler/components/play/VotingScreen";
import WritingScreen from "@/features/fake-filler/components/play/WritingScreen";
import { openPrompt } from "@/features/fake-filler/prompt";
import type { FFGameState } from "@/features/fake-filler/useGame";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

interface Props {
    table: FFGameState,
    userId: string,
    /** The way out of the board, which is the room's leave confirm. */
    onClose: () => void,
    /** The last round has been read. The room shows the result instead. */
    onFinish: () => void
}

// The board: which of the game's screens this player is on, and the band above it.
export default function PlayingGame({ table, userId, onClose, onFinish }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { game, reveal, votingRound, myRounds, actionError } = table;

    if (table.error !== null) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('fakeFiller.play.noGame')}
                    message={t(table.error)}
                />
            </View>
        )
    }

    if (game === null) {
        return <LoadingPage message={t('fakeFiller.play.loading')} />;
    }

    // The round the band is counting, which is not always the one the game is on.
    const at = reveal?.roundNumber ?? game.currentRound;
    const roundCount = {
        at,
        total: game.totalRounds,
        spoken: t('fakeFiller.play.voting.roundOf', { round: at, total: game.totalRounds })
    };

    const prompt = openPrompt(myRounds);
    const facts = game.gameMode === 'facts';

    const band = reveal !== null ? {
        label: t('fakeFiller.play.band.round'),
        count: roundCount,
        title: reveal.options.some(option => option.isTruth === true)
            ? t('fakeFiller.play.reveal.truthWas')
            : t('fakeFiller.play.reveal.title')
    } : game.phase === 'writing' ? {
        label: t('fakeFiller.play.band.prompt'),
        // During writing every round is open at once, so the count is the player's own prompts.
        count: myRounds.length === 0 ? undefined : {
            at: prompt.at + 1,
            total: myRounds.length,
            spoken: t('fakeFiller.play.writing.promptOf', { index: prompt.at + 1, total: myRounds.length })
        },
        title: t('fakeFiller.play.writing.title'),
        // Only until the player has written once.
        subtitle: prompt.at === 0 && !prompt.done ? t('fakeFiller.play.writing.intro') : undefined
    } : {
        label: t('fakeFiller.play.band.round'),
        count: roundCount,
        title: facts ? t('fakeFiller.play.voting.title') : t('fakeFiller.play.voting.titleCreative'),
        subtitle: votingRound?.canVote === true
            ? (facts ? t('fakeFiller.play.voting.hint') : t('fakeFiller.play.voting.hintCreative'))
            : undefined
    };

    return (
        <View style={styles.page}>
            <PlayBand onClose={onClose} closeLabel={t('lobby.leave')} {...band} />

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

            {reveal !== null ? (
                <RoundRevealScreen
                    game={game}
                    reveal={reveal}
                    userId={userId}
                    // Whether there is another prompt behind this one.
                    more={reveal.roundNumber < game.totalRounds}
                    // The pacing is the host's; everybody else waits to be moved.
                    isHost={game.ownerId === userId}
                    busy={table.advancing}
                    onContinue={() => {
                        void table.advance().then(moved => {
                            // The last round has been read, so the room moves on to the result.
                            if (moved && reveal.roundNumber >= game.totalRounds) onFinish();
                        });
                    }}
                />
            ) : game.phase === 'writing' ? (
                <WritingScreen
                    game={game}
                    rounds={myRounds}
                    busy={table.submitting}
                    onSubmit={table.submitAnswer}
                />
            ) : votingRound !== null ? (
                <VotingScreen
                    // Keyed by the round, so the half-made choice inside it is torn down with the round it belonged to.
                    key={votingRound.id}
                    game={game}
                    round={votingRound}
                    busy={table.voting}
                    onVote={table.castVote}
                />
            ) : (
                // Voting, but there is no round to show.
                <LoadingPage message={t('fakeFiller.results.loading')} />
            )}
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
