import LoadingPage from '@/components/layout/LoadingPage';
import AppText from '@/components/text/AppText';
import InGameHeader from '@/components/ui/InGameHeader';
import InlineNotification from '@/components/ui/InlineNotification';
import { Brand, Spacing, withAlpha } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import AnswerScreen from '@/features/one-of-us/components/multi-device/AnswerScreen';
import AnswerVoteScreen from '@/features/one-of-us/components/multi-device/AnswerVoteScreen';
import DealScreen from '@/features/one-of-us/components/multi-device/DealScreen';
import RoundReveal from '@/features/one-of-us/components/multi-device/RoundReveal';
import { aliveCount, mayorSeatOf } from '@/features/one-of-us/multi-device-flow';
import type { OOUGameState } from '@/features/one-of-us/useMultiDeviceOneOfUsGame';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { View } from 'react-native';

interface Props {
    /** The way out of the board, which is the room's leave confirm. */
    onClose: () => void
    /** The last elimination has been read. The room shows the result instead. */
    onFinish: () => void
    table: OOUGameState
    userId: string
}

// The board: which of the game's screens this player is on, and the band above it.
export default function PlayingGame({ onClose, onFinish, table, userId }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const { game, reveal, round, votingRound, actionError } = table;

    if (table.error !== null) {
        return (
            <View style={styles.failed}>
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('oneOfUs.multiDevice.play.noGame')}
                    message={t(table.error)}
                />
            </View>
        )
    }

    if (game === null) {
        return <LoadingPage message={t('oneOfUs.multiDevice.play.loading')} />;
    }

    // The deal lays its own band and its own gutters, so it stands outside the board frame below.
    if (reveal === null && table.dealing) {
        return (
            <DealScreen
                amNitwit={game.amNitwit}
                prompt={game.myPrompt}
                onDone={table.dismissDeal}
                onLeave={onClose}
            />
        )
    }

    const mayor = mayorSeatOf(game.players);

    return (
        <View style={styles.page}>
            <View style={styles.header}>
                <InGameHeader
                    onClose={onClose}
                    closeLabel={t('oneOfUs.play.close')}
                    label={t('oneOfUs.multiDevice.play.label', {
                        round: reveal?.roundNumber ?? game.currentRound
                    })}
                >
                    {/* No round total to count against, so the band counts the table instead: it shrinks by one a round. */}
                    <View style={styles.chip}>
                        <AppText style={styles.chipText}>
                            {t('oneOfUs.multiDevice.play.stillIn', { count: aliveCount(game.players) })}
                        </AppText>
                    </View>
                </InGameHeader>
            </View>

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
                <RoundReveal
                    busy={table.continuing}
                    gameOver={table.gameOver}
                    players={game.players}
                    reveal={reveal}
                    userId={userId}
                    onContinue={() => void table.continueRound()}
                    onFinish={onFinish}
                />
            ) : table.amOut ? (
                <Spectating />
            ) : table.answering && round !== null ? (
                <AnswerScreen
                    busy={table.submitting}
                    myAnswer={game.myAnswer}
                    prompt={game.myPrompt}
                    round={round}
                    onSubmit={table.submitAnswer}
                />
            ) : votingRound !== null ? (
                <AnswerVoteScreen
                    // Keyed by the round, so the half-made choice inside it is torn down with the round it belonged to.
                    key={votingRound.id}
                    busy={table.voting}
                    mayorName={mayor === null ? null : mayor.name}
                    myAnswer={game.myAnswer}
                    myVoteSlot={game.myVoteSlot}
                    round={votingRound}
                    onVote={table.castVote}
                />
            ) : (
                // A phase with nothing this player may do, which the next frame resolves.
                <LoadingPage message={t('oneOfUs.multiDevice.play.waiting')} />
            )}
        </View>
    )
}

// Voted out: still at the table, still watching, no longer allowed to act.
function Spectating() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.middle}>
            <InlineNotification
                icon='eye'
                color={theme.colors.lemon}
                title={t('oneOfUs.multiDevice.play.out.title')}
                message={t('oneOfUs.multiDevice.play.out.message')}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        flex: 1,
        width: '100%',
        gap: Spacing.two
    },
    // The band bleeds through this padding, so it must match the notice/content screens' own inset.
    header: {
        paddingHorizontal: Spacing.four
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
    },
    middle: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four
    },
    // Paper on every accent and in every scheme, so its digits are ink on every accent and in every scheme.
    chip: {
        flexShrink: 0,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 9,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: withAlpha(Brand.textOnAccent, 0.92)
    },
    chipText: {
        fontSize: 10.5,
        fontWeight: 900,
        letterSpacing: 0.4,
        fontVariant: ['tabular-nums'],
        color: Brand.ink
    }
}))
