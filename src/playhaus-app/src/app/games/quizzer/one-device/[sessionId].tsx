import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BackstagePanel from "@/features/pubquizr/components/play/BackstagePanel";
import HandoffScreen from "@/features/pubquizr/components/play/HandoffScreen";
import PlayHeader from "@/features/pubquizr/components/play/PlayHeader";
import RoundProgress from "@/features/pubquizr/components/play/RoundProgress";
import RoundStandings from "@/features/pubquizr/components/play/RoundStandings";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import VerdictButtons from "@/features/pubquizr/components/play/VerdictButtons";
import { ROUND_OPEN, seatsOf, standingsOf, turnOf } from "@/features/pubquizr/round-one";
import { useQuizSession } from "@/features/pubquizr/useQuizSession";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/**
 * Round 1, played on one phone.
 *
 * The screen is two frames and the rule for moving between them. The hand-off is a
 * lemon stop sign naming whoever has to take the phone; the board behind it has the
 * question, the answer and the two verdict buttons. You get the hand-off when the
 * reading changes hands and the board once the new quizmaster has said they are
 * holding it.
 *
 * That gate is the whole reason the hand-off exists. This screen shows the answers, so
 * the moment the phone changes hands is the moment the game can be spoiled — the board
 * must not appear until somebody has claimed it.
 *
 * Nothing here decides anything about the game. Whose turn it is, what a question is
 * worth and who reads next all come back from the server on every verdict; this file
 * chooses which of two frames to draw and when to ask.
 */
export default function OneDeviceQuizPage() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const router = useRouter();

    // Claims the viewport: no bottom bar, no page scroller, and the board can size
    // itself to the window the way the design draws it. Called before every early
    // return below, so the hook order never changes.
    useFullScreen();

    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
    const game = useQuizSession(sessionId);

    /**
     * Whether the person holding the phone has said they are the quizmaster.
     *
     * Keyed by seat rather than a boolean, and that is what makes it work without any
     * bookkeeping: the hand-off is showing exactly when this does not match whoever is
     * reading, so the reading changing hands puts it back up on its own. It starts
     * unset, so the round opens on a hand-off — the first quizmaster has to be handed
     * the phone too.
     */
    const [claimedBy, setClaimedBy] = useState<number | null>(null);
    /** Who last held it, for the two avatars on the hand-off. */
    const [handedFrom, setHandedFrom] = useState<number | null>(null);

    function leave() {
        // `replace`, not `back`: this screen is reached from the setup form, and going
        // back to it would offer to start a second game of the one just left.
        router.replace(ROUTES.quizzerIndex);
    }

    if (game.status === 'loading') {
        return <LoadingPage message={t('pubquizr.play.loading')} />;
    }

    if (game.status === 'failed' || game.session === null || game.quiz === null) {
        return (
            <View style={styles.message}>
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(game.error ?? 'pubquizr.errors.generic')}
                >
                    <TextButton text={t('common.retry')} onPress={game.reload} />
                    <TextButton
                        text={t('common.backToGames')}
                        variant="muted"
                        onPress={leave}
                    />
                </InlineNotification>
            </View>
        )
    }

    const { session, quiz } = game;
    const turn = turnOf(session, quiz);

    // No turn means round 1 is behind them. The session has moved on to round 2, which
    // is not built yet, so the round ends on its own scoreboard rather than on a
    // question that is never coming.
    if (turn === null) {
        return <RoundStandings standings={standingsOf(session)} round={ROUND_OPEN} onLeave={leave} />;
    }

    if (claimedBy !== turn.quizmaster.seat) {
        return (
            <HandoffScreen
                quizmaster={turn.quizmaster}
                from={handedFrom === null
                    ? null
                    : seatsOf(session).find(seat => seat.seat === handedFrom) ?? null}
                round={session.currentRound}
                number={turn.number}
                total={turn.total}
                onReady={() => setClaimedBy(turn.quizmaster.seat)}
            />
        )
    }

    return (
        <View style={styles.board}>
            <PlayHeader quizmaster={turn.quizmaster} onClose={leave} />

            <RoundProgress
                round={session.currentRound}
                number={turn.number}
                total={turn.total}
            />

            <View style={styles.script}>
                <ScriptCard prompt={turn.question.prompt} seats={seatsOf(session)} />

                <BackstagePanel answer={turn.answer} aliases={turn.aliases} />

                {game.rulingError !== null && (
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        message={t(game.rulingError)}
                    />
                )}

                <VerdictButtons
                    answering={turn.answering}
                    nextUp={turn.nextUp}
                    busy={game.ruling}
                    onVerdict={correct => {
                        // Remembered before the verdict goes out, because the answer
                        // that comes back may well have moved the reading on — and the
                        // hand-off then wants to say who it is coming *from*.
                        setHandedFrom(turn.quizmaster.seat);
                        game.rule(correct);
                    }}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    board: {
        flex: 1,
        width: '100%',
        paddingBottom: 26
    },

    // The middle of the board grows and the two ends do not, so a long question takes
    // the slack rather than pushing the buttons off the bottom edge.
    script: {
        marginTop: 16,
        flex: 1,
        minHeight: 0,
        gap: 14
    },

    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingBottom: Spacing.six
    }
}))
