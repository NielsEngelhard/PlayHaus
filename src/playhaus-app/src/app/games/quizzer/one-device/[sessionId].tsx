import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import ActionButton from "@/components/ui/ActionButton";
import HandoffScreen from "@/components/ui/HandoffScreen";
import InGameHeader, { type SegmentState } from "@/components/ui/InGameHeader";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ClosestBoard from "@/features/pubquizr/components/play/ClosestBoard";
import ClosestResultScreen from "@/features/pubquizr/components/play/ClosestResultScreen";
import DescribeBoard from "@/features/pubquizr/components/play/DescribeBoard";
import FinalResultsScreen from "@/features/pubquizr/components/play/FinalResultsScreen";
import HotSeatBoard from "@/features/pubquizr/components/play/HotSeatBoard";
import ListBoard from "@/features/pubquizr/components/play/ListBoard";
import RoundIntroScreen from "@/features/pubquizr/components/play/RoundIntroScreen";
import RoundStandings from "@/features/pubquizr/components/play/RoundStandings";
import ScriptCard from "@/features/pubquizr/components/play/ScriptCard";
import TurnStrip from "@/features/pubquizr/components/play/TurnStrip";
import { hotSeatTurnOf, ROUND_CHOICE, ROUND_OPEN } from "@/features/pubquizr/hot-seat";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { finaleTurnOf, finalistsOf, finalStandingsOf, ROUND_FINALE } from "@/features/pubquizr/round-seven";
import { doubleDownPoolOf, doubleDownTurnOf, EASY_POINTS, HARD_POINTS, ROUND_DOUBLE_DOWN } from "@/features/pubquizr/round-six";
import { closestResultOf, closestTurnOf, ROUND_CLOSEST, type ClosestResult } from "@/features/pubquizr/round-three";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";
import { seatAt, seatsOf, standingsOf } from "@/features/pubquizr/seats";
import { useQuizSession } from "@/features/pubquizr/useQuizSession";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/** The rounds this build can play. Past the last of them the evening stops on a board. */
const PLAYABLE = [ROUND_OPEN, ROUND_CHOICE, ROUND_CLOSEST, ROUND_DESCRIBE, ROUND_LIST, ROUND_DOUBLE_DOWN, ROUND_FINALE];

// The evening as a track: one segment per round, filled as far as `through`.
function roundTrack(total: number, through: number): SegmentState[] {
    return Array.from({ length: total }, (_, index) => index < through ? 'played' : 'upcoming');
}

/** What a round is called, what its phone-holder does, and the rule they need first. */
interface RoundCopy {
    kind: string
    /** The one-line version, for the turn strip in the rounds that ask nobody. */
    lead: string
    job: string
    rule: string
    /** The two or three sentence version, for the screen that opens the round. */
    brief: string
}

// The three lines that change from round to round, written out per round.
function roundCopy(t: ReturnType<typeof useT>, round: number, name: string, zen: boolean): RoundCopy {
    const { kind, rule, brief } = roundKindAndRule(t, round, zen);

    switch (round) {
        case ROUND_CHOICE:
            return { kind, rule, brief, lead: t('pubquizr.play.leadChoice', { name }), job: t('pubquizr.play.handoff.jobChoice', { name }) };
        case ROUND_CLOSEST:
            return { kind, rule, brief, lead: t('pubquizr.play.leadClosest', { name }), job: t('pubquizr.play.handoff.jobClosest', { name }) };
        case ROUND_DESCRIBE:
            return { kind, rule, brief, lead: t('pubquizr.play.leadDescribe', { name }), job: t('pubquizr.play.handoff.jobDescribe', { name }) };
        case ROUND_LIST:
            return { kind, rule, brief, lead: t('pubquizr.play.leadList', { name }), job: t('pubquizr.play.handoff.jobList', { name }) };
        case ROUND_DOUBLE_DOWN:
            return { kind, rule, brief, lead: t('pubquizr.play.leadDoubleDown', { name }), job: t('pubquizr.play.handoff.jobDoubleDown', { name }) };
        case ROUND_FINALE:
            return { kind, rule, brief, lead: t('pubquizr.play.leadFinale', { name }), job: t('pubquizr.play.handoff.jobFinale', { name }) };
        default:
            return { kind, rule, brief, lead: t('pubquizr.play.leadOpen', { name }), job: t('pubquizr.play.handoff.jobOpen', { name }) };
    }
}

// A pub quiz, played on one phone.
export default function OneDeviceQuizPage() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const router = useRouter();

    // Claims the viewport: no bottom bar, no page scroller.
    useChromeless();

    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
    const game = useQuizSession(sessionId);

    // Whether the person holding the phone has said so.
    const [claimedBy, setClaimedBy] = useState<number | null>(null);
    /** Who last held it, for the two avatars on the hand-off. */
    const [handedFrom, setHandedFrom] = useState<number | null>(null);
    // The last round the table said it was ready for.
    const [startedRound, setStartedRound] = useState<number | null>(null);
    // The last round the table has been told what it is about to play.
    const [introducedRound, setIntroducedRound] = useState<number | null>(null);
    // Round 3's last settled question, captured off the settle itself.
    const [closestResult, setClosestResult] = useState<ClosestResult | null>(null);
    /** Round 6 only: which question was picked, and the turn it was picked for. */
    const [pick, setPick] = useState<{ turn: number | null, questionId: string | null }>({
        turn: null,
        questionId: null
    });

    function leave() {
        // `replace`, not `back`: this screen is reached from the setup form.
        router.replace(ROUTES.quizzerIndex);
    }

    /** The table says it has read the scores and is ready for what comes next. */
    function startRound(next: number) {
        setStartedRound(next);
        // A new round is a new person holding the phone, always: it opens on whoever is furthest behind.
        setClaimedBy(null);
        setHandedFrom(null);
        setPick({ turn: null, questionId: null });
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
    const seats = seatsOf(session);
    const round = session.currentRound;
    const playable = PLAYABLE.includes(round);
    const ordinal = roundOrdinalOf(session);

    // Reset during render rather than from an effect, the way the boards drop their own stage when the turn moves under them.
    if (round === ROUND_DOUBLE_DOWN && pick.turn !== session.currentPosition) {
        setPick({ turn: session.currentPosition, questionId: null });
    }
    const picked = pick.turn === session.currentPosition ? pick.questionId : null;

    // The evening is over.
    if (session.status === 'completed') {
        return (
            <FinalResultsScreen
                standings={finalStandingsOf(session)}
                onLeave={leave}
            />
        )
    }

    // Round 3 stops on its result before it moves anywhere else.
    if (closestResult !== null && !session.turnQuestionIds.includes(closestResult.dealtId)) {
        return (
            <ClosestResultScreen
                result={closestResult}
                onContinue={() => setClosestResult(null)}
            />
        )
    }

    // The scoreboard between rounds.
    const between = round > ROUND_OPEN
        && session.currentPosition === 0
        && startedRound !== round;

    if (between || !playable) {
        return (
            <>
                {/* The band gets gutters of its own here rather than the board's, because `RoundStandings` below already lays its own down. */}
                <View style={styles.band}>
                    <InGameHeader
                        onClose={leave}
                        closeLabel={t('pubquizr.play.close')}
                        label={t('pubquizr.play.standings.label', {
                            round: ordinal - 1,
                            total: session.totalRounds
                        })}
                        // The round about to start has not started, so the track stops at the one behind it.
                        segments={roundTrack(session.totalRounds, ordinal - 1)}
                    />
                </View>

                <RoundStandings
                    standings={standingsOf(session)}
                    round={ordinal - 1}
                    onNext={playable ? () => startRound(round) : null}
                    onLeave={leave}
                />
            </>
        )
    }

    const hotSeat = hotSeatTurnOf(session, quiz);
    const closest = closestTurnOf(session, quiz);
    const describe = describeTurnOf(session, quiz);
    const list = listTurnOf(session, quiz);
    const doubleDown = doubleDownTurnOf(session, quiz, picked);
    const finale = finaleTurnOf(session, quiz);

    // Round 6 is a choice before it is a question, so who is running the turn is known before there is a board to draw.
    const asking = round === ROUND_DOUBLE_DOWN
        ? {
            pool: doubleDownPoolOf(session, quiz),
            quizmaster: seatAt(seats, session.quizMasterSeat),
            answering: seatAt(seats, session.answeringSeat),
            number: session.currentPosition + 1
        }
        : null;

    // Whoever is holding the phone this turn, and how far into the round they are.
    const holder = hotSeat?.quizmaster ?? closest?.quizmaster ?? describe?.describer
        ?? list?.quizmaster ?? asking?.quizmaster ?? finale?.quizmaster ?? null;
    const number = hotSeat?.number ?? closest?.number ?? describe?.number
        ?? list?.number ?? asking?.number ?? finale?.number ?? 0;

    // A round the session says it is on but no board can draw is a deal this build does not understand.
    if (holder === null) {
        return (
            <>
                {/* The scoreboard again, so the band it wears is the scoreboard's. */}
                <View style={styles.band}>
                    <InGameHeader
                        onClose={leave}
                        closeLabel={t('pubquizr.play.close')}
                        label={t('pubquizr.play.standings.label', {
                            round: ordinal - 1,
                            total: session.totalRounds
                        })}
                        segments={roundTrack(session.totalRounds, ordinal - 1)}
                    />
                </View>

                <RoundStandings
                    standings={standingsOf(session)}
                    round={ordinal - 1}
                    onNext={null}
                    onLeave={leave}
                />
            </>
        )
    }

    const copy = roundCopy(t, round, holder.name, session.zenMode);

    // The round explains itself before anybody is handed the phone.
    if (introducedRound !== round && session.currentPosition === 0) {
        // The finale only: by the time round 7 opens.
        const finalists = round === ROUND_FINALE ? finalistsOf(session, seats) : null;
        const finaleMaster = round === ROUND_FINALE ? holder : null;

        return (
            <RoundIntroScreen
                round={ordinal}
                totalRounds={session.totalRounds}
                kind={copy.kind}
                brief={copy.brief}
                finalists={finalists}
                quizmaster={finaleMaster}
                onStart={() => setIntroducedRound(round)}
            />
        )
    }

    if (claimedBy !== holder.seat) {
        return (
            <HandoffScreen
                person={holder}
                from={seatAt(seats, handedFrom)}
                toneNumber={number}
                step={t('pubquizr.play.handoff.step', { round: ordinal, number, total: session.turnsInRound })}
                title={t('pubquizr.play.handoff.title', { name: holder.name })}
                body={copy.job}
                note={copy.rule}
                action={t('pubquizr.play.handoff.action')}
                onReady={() => setClaimedBy(holder.seat)}
            />
        )
    }

    return (
        <View style={styles.board}>
            <InGameHeader
                onClose={leave}
                closeLabel={t('pubquizr.play.close')}
                label={t('pubquizr.play.roundLabel', { round: ordinal, kind: copy.kind })}
                // Up to and including this one: the round being drawn is under way.
                segments={roundTrack(session.totalRounds, ordinal)}
            />

            {hotSeat !== null && (
                <HotSeatBoard
                    turn={hotSeat}
                    seats={seats}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    // Rounds 1 and 2 are the ones with a table to walk.
                    quickAssign
                    onSettle={(missedSeats, correctSeat, from) => {
                        // Remembered before the ruling goes out, because the session that comes back may well have moved the phone on.
                        setHandedFrom(from);
                        game.settleTurn(missedSeats, correctSeat);
                    }}
                />
            )}

            {closest !== null && (
                <ClosestBoard
                    turn={closest}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    onSettle={(settled, winners) => {
                        setHandedFrom(closest.quizmaster.seat);
                        setClosestResult(closestResultOf(closest, settled, winners));
                        game.settleClosest(settled);
                    }}
                />
            )}

            {describe !== null && (
                <DescribeBoard
                    turn={describe}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    onSettle={awards => {
                        setHandedFrom(describe.describer.seat);
                        game.settleDescribe(awards);
                    }}
                />
            )}

            {list !== null && (
                <ListBoard
                    turn={list}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    onSettle={awards => {
                        setHandedFrom(list.quizmaster.seat);
                        game.settleList(awards);
                    }}
                />
            )}

            {asking !== null && asking.answering !== null && doubleDown === null && (
                <View style={styles.choosing}>
                    <TurnStrip
                        quizmaster={holder}
                        answering={asking.answering}
                        lead={copy.lead}
                        run={0}
                        round={round}
                        number={asking.number}
                        total={session.turnsInRound}
                        // Nothing is decided yet: what it pays is the question being asked.
                        worth={0}
                    />

                    <ScriptCard
                        prompt={t('pubquizr.play.doubleDown.ask', { name: asking.answering.name })}
                        cue={t('pubquizr.play.doubleDown.cue')}
                        seats={seats}
                    >
                        {/* One tap for the whole choice, and a side the table has spent is a button that will not press. */}
                        <View style={styles.choice}>
                            <ActionButton
                                text={t('pubquizr.play.doubleDown.easy', { points: EASY_POINTS })}
                                icon="feather"
                                disabled={asking.pool.easy.length === 0}
                                style={styles.choiceButton}
                                onPress={() => setPick({
                                    turn: session.currentPosition,
                                    questionId: asking.pool.easy[0] ?? null
                                })}
                            />

                            <ActionButton
                                text={t('pubquizr.play.doubleDown.hard', { points: HARD_POINTS })}
                                icon="zap"
                                disabled={asking.pool.hard.length === 0}
                                style={styles.choiceButton}
                                onPress={() => setPick({
                                    turn: session.currentPosition,
                                    questionId: asking.pool.hard[0] ?? null
                                })}
                            />
                        </View>
                    </ScriptCard>
                </View>
            )}

            {doubleDown !== null && (
                <HotSeatBoard
                    turn={doubleDown}
                    seats={seats}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    // The question walks the whole table on a wrong answer, so there is somebody to skip past.
                    quickAssign
                    onSettle={(missedSeats, correctSeat, from) => {
                        setHandedFrom(from);
                        game.settleDoubleDown(doubleDown.dealt.id, missedSeats, correctSeat);
                    }}
                />
            )}

            {finale !== null && (
                <HotSeatBoard
                    turn={finale}
                    seats={seats}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    // No quick assign here: the finale is between two people, so there is never anybody to skip past.
                    onSettle={(missedSeats, correctSeat, from) => {
                        setHandedFrom(from);
                        game.settleFinale(missedSeats, correctSeat);
                    }}
                />
            )}
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The gap is the header's: its band ends on a hard line rather than in the slack the old 58pt row carried inside itself.
    board: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    // The board's gutters and nothing else, for a screen whose body lays down its own.
    band: {
        width: '100%',
        flexShrink: 0,
        paddingHorizontal: Spacing.four
    },

    // The choice screen, wearing the same frame the boards give themselves.
    choosing: {
        marginTop: 12,
        flex: 1,
        minHeight: 0,
        gap: 12
    },

    // Round 6's easy-or-hard buttons, side by side inside the script card.
    choice: {
        flexDirection: 'row',
        gap: Spacing.two
    },

    choiceButton: {
        flex: 1
    },

    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six
    }
}))
