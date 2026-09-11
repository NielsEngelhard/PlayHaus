import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import InGameHeader from "@/components/ui/InGameHeader";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import type { Phrase, TranslationKey } from "@/features/i18n/keys";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import DiscussScreen from "@/features/one-of-us/components/DiscussScreen";
import EliminationScreen from "@/features/one-of-us/components/EliminationScreen";
import GameOverScreen from "@/features/one-of-us/components/GameOverScreen";
import RolesBriefingScreen from "@/features/one-of-us/components/RolesBriefingScreen";
import SpeakingTurnScreen from "@/features/one-of-us/components/SpeakingTurnScreen";
import VoteScreen from "@/features/one-of-us/components/VoteScreen";
import WordRevealScreen from "@/features/one-of-us/components/WordRevealScreen";
import {
    alivePlayers,
    mayorSeat,
    openRound,
    resumeAt,
    seatFor,
    seatOf,
    wordFor,
    type Phase
} from "@/features/one-of-us/flow";
import { useSingleDeviceOneOfUsGame } from "@/features/one-of-us/useSingleDeviceOneOfUsGame";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

export default function PlayingSingleDeviceGame() {
    const t = useT();
    const phrase = usePhrase();
    const theme = useTheme();
    const styles = useStyles();
    const router = useRouter();

    useChromeless();

    const { gameId } = useLocalSearchParams<{ gameId: string }>();
    const play = useSingleDeviceOneOfUsGame(gameId);

    const [phase, setPhase] = useState<Phase | null>(null);
    const [openedFor, setOpenedFor] = useState<string | null>(null);
    const [chosen, setChosen] = useState<number | null>(null);
    const [briefed, setBriefed] = useState(false);

    if (play.game !== null && openedFor !== play.game.id) {
        setOpenedFor(play.game.id);
        setPhase(resumeAt(play.game));
    }

    function leave() {
        router.replace(ROUTES.oneOfUsIndex);
    }

    if (play.status === 'loading') {
        return <LoadingPage message={t('oneOfUs.play.loading')} />;
    }

    if (play.status === 'failed' || play.game === null) {
        return (
            <View style={styles.message}>
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(play.error ?? 'oneOfUs.errors.generic')}
                >
                    <TextButton text={t('common.retry')} onPress={play.reload} />
                    <TextButton
                        text={t('common.backToGames')}
                        variant="muted"
                        onPress={leave}
                    />
                </InlineNotification>
            </View>
        )
    }

    const game = play.game;

    if (phase === null) {
        return <LoadingPage message={t('oneOfUs.play.loading')} />;
    }

    const current = phase;
    const alive = alivePlayers(game);

    if (current.kind === 'over') {
        return (
            <GameOverScreen
                civiliansWon={current.civiliansWon}
                players={game.players.map((player, seat) => ({
                    seat: seatOf(player, seat),
                    role: player.role,
                    votedOut: player.isVotedOut
                }))}
                word={game.actualQuestion}
                imposterWord={game.imposterQuestion}
                onAgain={() => router.replace(ROUTES.oneOfUsSetupSingleDevice)}
                onLeave={leave}
            />
        )
    }

    // The word reveal, once per player before the first round.
    if (!briefed && current.kind === 'reveal' && current.index === 0) {
        return <RolesBriefingScreen onDone={() => setBriefed(true)} onLeave={leave} />;
    }

    if (current.kind === 'reveal') {
        const player = game.players[current.index];
        const previous = current.index > 0 ? game.players[current.index - 1] : null;

        return (
            // Keyed on the seat, so the phone going round is a new screen each time rather than the same one with a different name on it.
            <WordRevealScreen
                key={current.index}
                person={seatOf(player, current.index)}
                from={previous === null ? null : seatOf(previous, current.index - 1)}
                word={wordFor(game, player)}
                role={player.role}
                number={current.index + 1}
                total={game.players.length}
                // `game.players` is itself the order the phone goes round in.
                queue={game.players
                    .slice(current.index + 1)
                    .map((waiting, offset) => seatOf(waiting, current.index + 1 + offset))}
                onLeave={leave}
                onDone={() => setPhase(current.index + 1 < game.players.length
                    ? { kind: 'reveal', index: current.index + 1 }
                    // Everybody has their word.
                    : openRound(game, 1))}
            />
        )
    }

    return (
        <View style={styles.board}>
            {/* No track under the label. */}
            <InGameHeader
                onClose={leave}
                closeLabel={t('oneOfUs.play.close')}
                label={phrase(headerLabelFor(current))}
            >
                {/* No round total to count against, so the band counts the table instead: it shrinks by one a round. */}
                <View style={styles.chip}>
                    <AppText style={styles.chipText}>
                        {t('oneOfUs.multiDevice.play.stillIn', { count: alive.length })}
                    </AppText>
                </View>
            </InGameHeader>

            {current.kind === 'speak' && (() => {
                const speaker = seatFor(game, current.order[current.index]);

                // A speaking order naming somebody who is not in the game any more can only happen if the order outlived the round it was shuffled for.
                if (speaker === null) {
                    return <View />;
                }

                const following = current.index + 1 < current.order.length
                    ? seatFor(game, current.order[current.index + 1])
                    : null;

                return (
                    <SpeakingTurnScreen
                        speaker={speaker}
                        seats={alive.map(player => seatFor(game, player.playerId)!)}
                        nextUp={following}
                        number={current.index + 1}
                        total={current.order.length}
                        onNext={() => setPhase(current.index + 1 < current.order.length
                            ? { ...current, index: current.index + 1 }
                            : { kind: 'discuss', round: current.round })}
                    />
                )
            })()}

            {current.kind === 'discuss' && (
                <DiscussScreen
                    seats={alive.map(player => seatFor(game, player.playerId)!)}
                    mayor={mayorSeat(game)}
                    onVote={() => {
                        setChosen(null);
                        setPhase({ kind: 'vote', round: current.round });
                    }}
                />
            )}

            {current.kind === 'vote' && (
                <VoteScreen
                    seats={alive.map(player => seatFor(game, player.playerId)!)}
                    mayor={mayorSeat(game)}
                    chosen={chosen}
                    onChoose={setChosen}
                    busy={play.voting}
                    error={play.voteError}
                    onConfirm={() => {
                        const player = chosen === null ? null : game.players[chosen];
                        if (player === undefined || player === null) return;

                        void (async () => {
                            const result = await play.voteOut(player.playerId);
                            // Null is a refusal, and `play.voteError` is already saying so on the board this leaves up.
                            if (result === null) return;

                            setPhase(result.gameEnded
                                ? { kind: 'over', civiliansWon: result.civiliansWon }
                                : {
                                    kind: 'elimination',
                                    round: current.round,
                                    result
                                });
                        })();
                    }}
                />
            )}

            {current.kind === 'elimination' && (() => {
                const gone = seatFor(game, current.result.playerId);
                if (gone === null) return <View />;

                // The ring as it stood for the vote, not as it stands now.
                const ring = game.players
                    .filter(player =>
                        !player.isVotedOut
                        || player.playerId === current.result.playerId)
                    .map(player => seatFor(game, player.playerId)!);

                return (
                    <EliminationScreen
                        person={gone}
                        seats={ring}
                        role={current.result.playerRole}
                        remaining={alive.length}
                        nextRound={current.round + 1}
                        onNext={() => setPhase(openRound(game, current.round + 1))}
                    />
                )
            })()}
        </View>
    )
}

// Which of the four round labels the header wears.
function headerLabelFor(phase: Phase): Phrase {
    return { key: keyOf(phase), values: { round: roundOf(phase) } };
}

function keyOf(phase: Phase): TranslationKey {
    switch (phase.kind) {
        case 'discuss':
            return 'oneOfUs.play.roundDiscuss';
        case 'vote':
            return 'oneOfUs.play.roundVote';
        case 'elimination':
            return 'oneOfUs.play.roundResult';
        default:
            return 'oneOfUs.play.roundSpeak';
    }
}

/** Which round the header should name. The reveal is in front of round 1. */
function roundOf(phase: Phase): number {
    switch (phase.kind) {
        case 'speak':
        case 'discuss':
        case 'vote':
        case 'elimination':
            return phase.round;
        default:
            return 1;
    }
}

const useStyles = createThemedStyles(theme => ({
    // The gap is the header's: its band ends on a hard line rather than in the slack the old 58pt row carried inside itself.
    board: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six
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
