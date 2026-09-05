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

/**
 * The board: which of the game's screens this player is on, and the band above it.
 *
 * The phase comes off the server rather than being advanced here, which is the one thing
 * that makes this different from a wizard. There are two of them and no third — a
 * finished game is a *status*, not a stage — so what this switches on is the phase, the
 * round the table is voting on, and whether a reveal is being read.
 *
 * The reveal wins over the voting round on purpose. `useGame` holds `votingRound` at null
 * while a reveal is up, because the server has already moved `currentRound` on and
 * following it would replace the payoff with the next prompt in the same frame.
 */
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

    /**
     * The round the band is counting, which is not always the one the game is on: while
     * a reveal is up the table has moved on and the header must not.
     */
    const at = reveal?.roundNumber ?? game.currentRound;

    // During writing every round is open at once, so there is no position to draw — the
    // segments would be a bar with nothing to say. The writing screen counts answers
    // instead, which is the thing that is actually moving.
    // `played` rather than `won`/`lost`: a Fake Filler round is not something the table
    // wins or loses, it is a prompt that has been settled. Everything from the current
    // round on is still ahead.
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
                    // Whether there is another prompt behind this one. Read off the reveal
                    // rather than off `currentRound`, which has already moved.
                    more={reveal.roundNumber < game.totalRounds}
                    onContinue={() => {
                        table.dismissReveal();

                        // The last round has been read, so the room moves on to the
                        // result. Driven from here rather than from the game's status,
                        // because the status flipped the moment the vote landed and the
                        // reveal had not been read yet.
                        if (reveal.roundNumber >= game.totalRounds) onFinish();
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
                    // Keyed by the round, so the half-made choice inside it is torn down
                    // with the round it belonged to. Without this the next prompt opens
                    // with a slot already marked — the one picked last round, which is a
                    // different sentence entirely.
                    key={votingRound.id}
                    game={game}
                    round={votingRound}
                    busy={table.voting}
                    onVote={table.castVote}
                />
            ) : (
                // Voting, but there is no round to show: the game finished while this
                // player was somewhere else, so the room's result is what they want.
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
    // The board draws its own gutters: this page is chromeless, so it is handed the bare
    // window. See `useChromeless`.
    failed: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four
    }
}))
