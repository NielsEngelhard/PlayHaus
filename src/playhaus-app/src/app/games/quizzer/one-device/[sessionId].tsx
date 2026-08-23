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
import TurnBanner from "@/features/pubquizr/components/play/TurnBanner";
import ValidateButton from "@/features/pubquizr/components/play/ValidateButton";
import VerdictButtons from "@/features/pubquizr/components/play/VerdictButtons";
import { ROUND_OPEN, seatsOf, standingsOf, turnOf } from "@/features/pubquizr/round-one";
import { useQuizSession } from "@/features/pubquizr/useQuizSession";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/**
 * How far through one question's ritual the quizmaster is.
 *
 * Three steps rather than two buttons, and every one of them is a guard. `covered` is
 * the answer still hidden from the rest of the table; `revealed` is the quizmaster
 * having read it; `judging` is the only state in which a tap can score anything. A
 * phone being turned round a table cannot fall through all three by accident.
 */
type Stage = 'covered' | 'revealed' | 'judging';

/**
 * Round 1, played on one phone.
 *
 * The screen is two frames and the rules for moving between them. The hand-off is a
 * full-bleed stop sign naming whoever has to take the phone; the board behind it has
 * the question, the covered answer and the verdict. You get the hand-off when the
 * reading changes hands and the board once the new quizmaster has said they are
 * holding it.
 *
 * That gate is the whole reason the hand-off exists, and the stage machine above is the
 * same idea one level down: this screen carries the answers, so every step towards
 * showing or scoring one is a thing somebody has to mean to do.
 *
 * Nothing here decides anything about the game. Whose turn it is, what a question is
 * worth and who reads next all come back from the server on every verdict; this file
 * chooses which frame to draw and when to ask.
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

    /**
     * How far through the current question we are, and which question that was.
     *
     * The id travels with the stage so the ritual resets itself: a new question is a
     * different id, which is a covered answer again. Holding the two apart would mean
     * remembering to reset one from wherever the other changes, and the one place that
     * would eventually be forgotten is the one that leaves the next question's answer
     * already on screen.
     */
    const [progress, setProgress] = useState<{ questionId: string | null, stage: Stage }>(
        { questionId: null, stage: 'covered' }
    );

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

    /*
     * Reset during render rather than from an effect.
     *
     * A new question has to arrive with its answer already covered, in the same commit
     * that brings it. Cleared afterwards, the board paints once showing the last
     * question's revealed panel over the new question's prompt — which is the answer to
     * a question nobody has been asked yet, in front of the whole table. Same reason
     * `useQuizzes` empties its shelf during render.
     */
    if (progress.questionId !== turn.dealt.id) {
        setProgress({ questionId: turn.dealt.id, stage: 'covered' });
    }

    // What this render is actually drawing. React restarts the render on the setState
    // above, so this only stands in for one discarded pass.
    const stage: Stage = progress.questionId === turn.dealt.id ? progress.stage : 'covered';

    // Captured rather than read off `turn` inside the callback: this is a hoisted
    // function, so TypeScript cannot see that the null check above still holds by the
    // time it runs.
    const questionId = turn.dealt.id;

    function moveTo(next: Stage) {
        setProgress({ questionId, stage: next });
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
            <PlayHeader onClose={leave} />

            <RoundProgress
                round={session.currentRound}
                number={turn.number}
                total={turn.total}
                scoring={turn.scoring}
            />

            <View style={styles.turn}>
                <TurnBanner quizmaster={turn.quizmaster} answering={turn.answering} />

                <ScriptCard prompt={turn.question.prompt} seats={seatsOf(session)} />

                <BackstagePanel
                    answer={turn.answer}
                    aliases={turn.aliases}
                    revealed={stage !== 'covered'}
                    onReveal={() => moveTo('revealed')}
                />

                {game.rulingError !== null && (
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        message={t(game.rulingError)}
                    />
                )}

                {stage === 'judging' ? (
                    <VerdictButtons
                        answering={turn.answering}
                        nextUp={turn.nextUp}
                        scoring={turn.scoring}
                        busy={game.ruling}
                        onVerdict={correct => {
                            // Remembered before the verdict goes out, because the answer
                            // that comes back may well have moved the reading on — and
                            // the hand-off then wants to say who it is coming *from*.
                            setHandedFrom(turn.quizmaster.seat);
                            game.rule(correct);
                        }}
                    />
                ) : (
                    <ValidateButton
                        answering={turn.answering}
                        unlocked={stage === 'revealed'}
                        onPress={() => moveTo('judging')}
                    />
                )}
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

    // The middle of the board grows and everything else does not, so a long question
    // takes the slack rather than pushing the buttons off the bottom edge.
    turn: {
        marginTop: 14,
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
