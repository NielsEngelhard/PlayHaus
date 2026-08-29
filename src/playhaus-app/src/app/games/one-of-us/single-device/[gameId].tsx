import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import InlineNotification from "@/components/ui/InlineNotification";
import PlayHeader from "@/components/ui/PlayHeader";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import DiscussScreen from "@/features/one-of-us/components/DiscussScreen";
import EliminationScreen from "@/features/one-of-us/components/EliminationScreen";
import GameOverScreen from "@/features/one-of-us/components/GameOverScreen";
import SpeakingTurnScreen from "@/features/one-of-us/components/SpeakingTurnScreen";
import VoteScreen from "@/features/one-of-us/components/VoteScreen";
import WordRevealScreen from "@/features/one-of-us/components/WordRevealScreen";
import {
    alivePlayers,
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

/**
 * One of Us, played on one phone.
 *
 * This file is the router between the game's screens and nothing else — the same job
 * `app/games/quizzer/one-device/[sessionId].tsx` does for a pub quiz, and built the same
 * way, because a table sharing one phone has the same problem in both games: the screen
 * has to stop and wait at every point where the phone changes hands or something is
 * about to be revealed.
 *
 * The one real difference is where the state lives. A pub quiz asks the server whose
 * turn it is on every ruling; this game does not, because the server has nothing to say
 * about it. Everything that happens in a round happens out loud across a table — the
 * words are spoken, the argument is had in the room — and the only write in the whole
 * game is the name that comes out of a vote. So the phase is held here in `phase`, the
 * server holds who is out, and the two only ever meet at a vote. See `flow.ts`.
 *
 * The phases in order:
 *
 * **reveal** goes round the table once before the first round, handing each player their
 * own word behind a hand-off wall. It happens once per game, not once per round.
 *
 * **speak** names one player at a time in an order reshuffled every round, so nobody
 * gets the advantage of going last twice.
 *
 * **discuss** is the argument, which the phone stays out of — no timer, and no tie
 * handling, because the table settles both of those itself.
 *
 * **vote** is the one screen that writes anything, behind a two-step gate.
 *
 * **elimination** says who went and what they were, which is the only information the
 * game ever gives back and the thing the next round is argued from.
 *
 * **over** reveals everybody.
 */
export default function PlayingSingleDeviceGame() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const router = useRouter();

    // Claims the viewport: no bottom bar, no page scroller, and the screens can size
    // themselves to the window. Called before every early return below, so the hook
    // order never changes.
    useFullScreen();

    const { gameId } = useLocalSearchParams<{ gameId: string }>();
    const play = useSingleDeviceOneOfUsGame(gameId);

    /** Which screen is up, or null until the game has loaded and can say. */
    const [phase, setPhase] = useState<Phase | null>(null);
    /** The game `phase` was opened for, so a different one is not resumed into. */
    const [openedFor, setOpenedFor] = useState<string | null>(null);
    /** The seat the vote screen has highlighted, before it is committed. */
    const [chosen, setChosen] = useState<number | null>(null);

    /*
     * Where this game opens, worked out once and then left alone.
     *
     * Set during render rather than from an effect — the same thing `useQuizzes` does
     * next door, and for the same reason: an effect would paint one frame of the wrong
     * screen first. React drops this render and immediately re-runs it with the phase
     * set, so nothing is committed in between.
     *
     * It could not simply be `phase ?? resumeAt(game)` inline, because `resumeAt` is
     * not pure: resuming mid-game deals a fresh speaking order, so every re-render
     * before the first tap would deal another one and the name on screen would change
     * under a table that was still reading it. Keying on the game id is what makes it
     * happen exactly once.
     */
    if (play.game !== null && openedFor !== play.game.id) {
        setOpenedFor(play.game.id);
        setPhase(resumeAt(play.game));
    }

    function leave() {
        // `replace`, not `back`: this screen is reached from the setup form, and going
        // back to it would offer to start a second game of the one just left.
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

    // Only ever true for the render that chose the phase, which the block above sets
    // during this same render — React drops that render and re-runs with it in place,
    // so this is a frame nobody sees rather than a state the screen can sit in.
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

    /*
     * The word reveal, once per player before the first round.
     *
     * Full-bleed and without the header above it, because the hand-off it opens on has
     * to cover the whole window to be worth anything — a stop sign framed by the app's
     * own chrome reads as another card. See `HandoffScreen`.
     */
    if (current.kind === 'reveal') {
        const player = game.players[current.index];
        const previous = current.index > 0 ? game.players[current.index - 1] : null;

        return (
            <WordRevealScreen
                person={seatOf(player, current.index)}
                from={previous === null ? null : seatOf(previous, current.index - 1)}
                word={wordFor(game, player)}
                number={current.index + 1}
                total={game.players.length}
                onDone={() => setPhase(current.index + 1 < game.players.length
                    ? { kind: 'reveal', index: current.index + 1 }
                    // Everybody has their word. The first round opens on its own
                    // shuffle, the same as every round after it.
                    : openRound(game, 1))}
            />
        )
    }

    return (
        <View style={styles.board}>
            <PlayHeader
                onClose={leave}
                label={t('oneOfUs.play.roundLabel', { round: roundOf(current) })}
                closeLabel={t('oneOfUs.play.close')}
            />

            {current.kind === 'speak' && (() => {
                const speaker = seatFor(game, current.order[current.index]);

                // A speaking order naming somebody who is not in the game any more can
                // only happen if the order outlived the round it was shuffled for.
                // Reshuffling is the honest repair: nothing has been said yet this
                // round that re-speaking it would spoil.
                if (speaker === null) {
                    return <View />;
                }

                return (
                    <SpeakingTurnScreen
                        speaker={speaker}
                        round={current.round}
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
                    onVote={() => {
                        setChosen(null);
                        setPhase({ kind: 'vote', round: current.round });
                    }}
                />
            )}

            {current.kind === 'vote' && (
                <VoteScreen
                    seats={alive.map(player => seatFor(game, player.playerId)!)}
                    chosen={chosen}
                    onChoose={setChosen}
                    busy={play.voting}
                    error={play.voteError}
                    onConfirm={() => {
                        const player = chosen === null ? null : game.players[chosen];
                        if (player === undefined || player === null) return;

                        void (async () => {
                            const result = await play.voteOut(player.playerId);
                            // Null is a refusal, and `play.voteError` is already saying
                            // so on the board this leaves up. Moving on would announce
                            // an elimination that never happened.
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

                return (
                    <EliminationScreen
                        person={gone}
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

const useStyles = createThemedStyles(() => ({
    board: {
        flex: 1,
        width: '100%'
    },

    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingBottom: Spacing.six
    }
}))
