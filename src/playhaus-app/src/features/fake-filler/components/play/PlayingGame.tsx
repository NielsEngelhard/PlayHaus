import LoadingPage from "@/components/layout/LoadingPage";
import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import RoundRevealScreen from "@/features/fake-filler/components/play/RoundRevealScreen";
import VotingScreen from "@/features/fake-filler/components/play/VotingScreen";
import WritingScreen from "@/features/fake-filler/components/play/WritingScreen";
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

    // During writing every round is open at once, so there is no position to draw.
    const segments: SegmentState[] | undefined = game.phase === 'writing'
        ? undefined
        : Array.from({ length: game.totalRounds }, (_, index): SegmentState => (
            index + 1 < at ? 'played' : 'upcoming'
        ));

    const label = game.phase === 'writing'
        ? t('fakeFiller.play.writing.title')
        : t('fakeFiller.play.voting.roundOf', { round: at, total: game.totalRounds });

    return (
        <View style={styles.page}>
            <InGameHeader onClose={onClose} closeLabel={t('lobby.leave')} label={label} segments={segments} />

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
        width: '100%',
        gap: Spacing.two
    },
    notice: {
        paddingHorizontal: Spacing.four
    },
    // The board draws its own gutters: this page is chromeless, so it is handed the bare window.
    failed: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four
    }
}))
