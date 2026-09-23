import type { SegmentState } from "@/components/ui/InGameHeader";
import InGameHeader from "@/components/ui/InGameHeader";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import BoardFrame from "@/features/pubquizr/components/board/BoardFrame";
import BoardSpotlight from "@/features/pubquizr/components/board/BoardSpotlight";
import ChoiceWatchBoard from "@/features/pubquizr/components/board/ChoiceWatchBoard";
import DescribeWatchBoard from "@/features/pubquizr/components/board/DescribeWatchBoard";
import DoubleDownWatchBoard from "@/features/pubquizr/components/board/DoubleDownWatchBoard";
import ListWatchBoard from "@/features/pubquizr/components/board/ListWatchBoard";
import QuizmasterNote from "@/features/pubquizr/components/board/QuizmasterNote";
import TurnOrderStrip, { type TurnOrder, type TurnPair } from "@/features/pubquizr/components/board/TurnOrderStrip";
import WalkWatchBoard from "@/features/pubquizr/components/board/WalkWatchBoard";
import ChoicePadControl from "@/features/pubquizr/components/control/ChoicePadControl";
import ClosestGuessControl from "@/features/pubquizr/components/control/ClosestGuessControl";
import ClosestSettleControl from "@/features/pubquizr/components/control/ClosestSettleControl";
import DescribeControl from "@/features/pubquizr/components/control/DescribeControl";
import DoubleDownControl from "@/features/pubquizr/components/control/DoubleDownControl";
import HotSeatControl from "@/features/pubquizr/components/control/HotSeatControl";
import ListControl from "@/features/pubquizr/components/control/ListControl";
import ClosestResultScreen from "@/features/pubquizr/components/play/ClosestResultScreen";
import FinaleTieBreakScreen from "@/features/pubquizr/components/play/FinaleTieBreakScreen";
import RoundIntroScreen from "@/features/pubquizr/components/play/RoundIntroScreen";
import RoundStandings from "@/features/pubquizr/components/play/RoundStandings";
import { hotSeatTurnOf, isHotSeatRound, previousRulingOf, ROUND_CHOICE } from "@/features/pubquizr/hot-seat";
import {
    awardedIdsOn,
    awardedOn,
    endsAtOn,
    missedSeatsOf,
    picksOf,
    readySeatsOn,
    roundOpenOn
} from "@/features/pubquizr/multi-device/control";
import { currentQuizmasterOf } from "@/features/pubquizr/multi-device/quizmaster";
import type { PQTableState } from "@/features/pubquizr/multi-device/useQuizTable";
import type { QuizDetail } from "@/features/pubquizr/pubquizr-quizzes";
import type { QuizSession } from "@/features/pubquizr/pubquizr-sessions";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { finaleTieOf, finaleTurnOf, finalistsOf, ROUND_FINALE } from "@/features/pubquizr/round-seven";
import { doubleDownPoolOf, doubleDownTurnOf, ROUND_DOUBLE_DOWN } from "@/features/pubquizr/round-six";
import { closestRevealOf, closestTurnOf, ROUND_CLOSEST } from "@/features/pubquizr/round-three";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";
import { seatAt, seatsOf, standingsOf } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

// The evening as a track: one segment per round, filled as far as `through`.
function roundTrack(total: number, through: number): SegmentState[] {
    return Array.from({ length: total }, (_, index) => index < through ? 'played' : 'upcoming');
}

interface Props {
    onLeave: () => void
    quiz: QuizDetail
    session: QuizSession
    table: PQTableState
}

// Multi device without a shared screen: every phone is a whole board with the turn order above it, and the walk rounds' question only on the reader's.
export default function QuizBoardView({ onLeave, quiz, session, table }: Props) {
    const t = useT();
    const styles = useStyles();
    const { user } = useAuth();

    // Kept here as well as in the room, because the room relays a frame to everybody but its author.
    const [opened, setOpened] = useState<number | null>(null);
    // The finale is preceded by the standings, which each phone reads at its own pace.
    const [standingsSeen, setStandingsSeen] = useState(false);

    const { control } = table;
    const me = table.mySeat;

    const seats = seatsOf(session);
    const ordinal = roundOrdinalOf(session);
    const { brief, kind } = roundKindAndRule(t, session.currentRound, session.zenMode);
    const label = t('pubquizr.play.roundLabel', { round: ordinal, kind });
    const segments = roundTrack(session.totalRounds, ordinal);
    const round = session.currentRound;

    // The room's host is who moves the whole table on past a result nobody has to rule on.
    const hosting = table.lobby !== null && user !== null && table.lobby.hostId === user.id;
    const hostName = table.lobby?.players.find(player => player.userId === table.lobby?.hostId)?.name ?? '';

    const [opening] = session.turnQuestionIds;
    const master = seatAt(seats, session.quizMasterSeat);

    function frame(key: string, strip: ReactNode | null, board: ReactNode, centered = false) {
        return fade(key, (
            <BoardFrame
                centered={centered}
                footer={<QuizmasterNote mySeat={me} quizmaster={currentQuizmasterOf(session)} />}
                label={label}
                onClose={onLeave}
                segments={segments}
                strip={strip}
            >
                {board}
            </BoardFrame>
        ))
    }

    function fade(key: string, node: ReactNode) {
        return (
            <SlideFadeIn offsetY={14} durationMs={240} replayKey={key} style={styles.fill}>
                {node}
            </SlideFadeIn>
        )
    }

    // Says this phone has read what it had to, on top of everybody the room already knows about, so the last frame kept is nearly the whole table.
    function sayReady(questionId: string) {
        if (me === null) return;

        table.emit({ kind: 'ready', questionId, seats: [...readySeatsOn(control, questionId), me] });
    }

    // Round 3's result stays up on every phone until the host moves the table on.
    const result = table.reveal === null ? null : closestRevealOf(session, quiz, table.reveal);
    if (result !== null) {
        return fade(`closest:${result.dealtId}`, (
            <ClosestResultScreen
                result={result}
                onContinue={hosting && opening !== undefined
                    ? () => table.emit({ kind: 'flow', questionId: opening, stage: 'covered' })
                    : undefined}
                waitingNote={t('pubquizr.board.onlyMasterMovesOn', { name: hostName })}
            />
        ))
    }

    const unopened = session.currentPosition === 0 && opening !== undefined && master !== null
        && opened !== round && !roundOpenOn(control, round);

    // The finale opens on where everybody stands, before it names the two it is between.
    if (unopened && round === ROUND_FINALE && !standingsSeen) {
        return fade(`standings:${ordinal - 1}`, (
            <>
                <View style={styles.band}>
                    <InGameHeader
                        onClose={onLeave}
                        closeLabel={t('pubquizr.play.close')}
                        label={t('pubquizr.play.standings.label', { round: ordinal - 1, total: session.totalRounds })}
                        segments={roundTrack(session.totalRounds, ordinal - 1)}
                        title={t('pubquizr.play.standings.title', { round: ordinal - 1 })}
                        subtitle={t('pubquizr.play.standings.description')}
                    />
                </View>

                <RoundStandings
                    standings={standingsOf(session)}
                    round={ordinal - 1}
                    onNext={() => setStandingsSeen(true)}
                    onLeave={onLeave}
                />
            </>
        ))
    }

    // A shared place in the finale is played for first, and only the quizmaster's phone taps the winners in.
    const tie = round === ROUND_FINALE ? finaleTieOf(session, seats) : null;
    if (tie !== null) {
        return fade('tie-break', (
            <FinaleTieBreakScreen
                round={ordinal}
                tie={tie}
                quizmaster={master}
                busy={table.ruling}
                error={table.rulingError}
                onConfirm={master !== null && me === master.seat ? table.chooseFinalists : undefined}
            />
        ))
    }

    // A round states itself before it starts, and the phone that reads the questions is the one that says go.
    if (unopened && opening !== undefined && master !== null) {
        if (me === master.seat) {
            return fade(`intro:${round}`, (
                <RoundIntroScreen
                    round={ordinal}
                    totalRounds={session.totalRounds}
                    kind={kind}
                    brief={brief}
                    finalists={round === ROUND_FINALE ? finalistsOf(session, seats) : null}
                    quizmaster={round === ROUND_FINALE ? master : null}
                    onStart={() => {
                        setOpened(round);
                        table.emit({ kind: 'gate', questionId: opening, round });
                    }}
                />
            ))
        }

        return frame(`waiting:${round}`, null, (
            <BoardSpotlight
                seat={master}
                title={t('pubquizr.play.roundTitle', { round: ordinal, kind })}
                message={t('pubquizr.control.roundStarting', { name: master.name })}
            />
        ), true)
    }

    // Rounds 1, 2 and 7 are the same question down a different line.
    const hotSeat = isHotSeatRound(round)
        ? hotSeatTurnOf(session, quiz)
        : round === ROUND_FINALE ? finaleTurnOf(session, quiz) : null;

    const closest = round === ROUND_CLOSEST ? closestTurnOf(session, quiz) : null;
    const describe = round === ROUND_DESCRIBE ? describeTurnOf(session, quiz) : null;
    const list = round === ROUND_LIST ? listTurnOf(session, quiz) : null;

    // Round 6's question is whichever one the player pinned, so there is no turn at all until they have.
    const doubleDown = round === ROUND_DOUBLE_DOWN
        ? doubleDownTurnOf(session, quiz, session.activeQuestionId ?? null)
        : null;

    const asking = round === ROUND_DOUBLE_DOWN && doubleDown === null
        ? {
            answering: seatAt(seats, session.answeringSeat),
            pool: doubleDownPoolOf(session, quiz),
            quizmaster: seatAt(seats, session.quizMasterSeat)
        }
        : null;

    const walking = hotSeat ?? doubleDown;

    if (walking !== null) {
        const missed = missedSeatsOf(control, walking.dealt.id);
        const walked = missed.length;
        const asked = walking.remaining[walked] ?? walking.answering;
        const choice = round === ROUND_CHOICE;

        const order: TurnOrder = {
            label: choice ? t('pubquizr.board.noQuizmaster') : t('pubquizr.board.quizmaster'),
            lead: choice ? null : walking.quizmaster,
            leadNote: asked.seat === me ? t('pubquizr.board.tapYourself') : t('pubquizr.board.isUp', { name: asked.name }),
            count: t('pubquizr.board.turnOf', { number: walked + 1, total: walking.remaining.length }),
            path: walking.remaining,
            current: asked.seat,
            missed
        };
        const strip = <TurnOrderStrip mySeat={me} order={order} />;

        // Round 2 is played on the answerer's own phone, and watched on everybody else's.
        if (choice && hotSeat !== null) {
            if (me === asked.seat) {
                return frame(`choice-control:${hotSeat.dealt.id}`, strip, (
                    <ChoicePadControl
                        bare
                        busy={table.ruling}
                        emit={table.emit}
                        error={table.rulingError}
                        missed={walked}
                        picks={picksOf(control, hotSeat.dealt.id)}
                        round={round}
                        turn={hotSeat}
                        onSettle={table.settleTurn}
                    />
                ))
            }

            return frame(`choice-watch:${hotSeat.dealt.id}`, strip, (
                <ChoiceWatchBoard
                    answering={asked}
                    picks={picksOf(control, hotSeat.dealt.id)}
                    seats={seats}
                    turn={hotSeat}
                />
            ))
        }

        if (me === walking.quizmaster.seat) {
            const settle = doubleDown !== null
                ? (missedSeats: number[], correctSeat: number | null) => {
                    table.settleDoubleDown(doubleDown.dealt.id, missedSeats, correctSeat);
                }
                : round === ROUND_FINALE ? table.settleFinale : table.settleTurn;

            return frame(`hotseat-control:${walking.dealt.id}`, strip, (
                <HotSeatControl
                    bare
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    round={round}
                    turn={walking}
                    onSettle={settle}
                />
            ))
        }

        return frame(`walk-watch:${walking.dealt.id}`, strip, (
            <WalkWatchBoard mySeat={me} previous={previousRulingOf(session, quiz)} turn={walking} walked={walked} />
        ))
    }

    if (closest !== null) {
        const seatsIn = table.closest !== null && table.closest.sessionQuestionId === closest.dealt.id
            ? table.closest.seatsIn
            : [];

        const order: TurnOrder = {
            label: t('pubquizr.board.quizmaster'),
            lead: closest.quizmaster,
            count: seatsIn.length > 0
                ? t('pubquizr.board.numbersIn', { done: seatsIn.length, total: closest.guessing.length })
                : t('pubquizr.board.everyoneAtOnce'),
            path: [],
            current: null,
            missed: []
        };
        const strip = <TurnOrderStrip mySeat={me} order={order} />;

        // The reader closes round 3, and at the smallest table that is somebody who guessed too.
        if (me === closest.quizmaster.seat) {
            return frame(`closest-control:${closest.dealt.id}`, strip, (
                <ClosestSettleControl
                    bare
                    busy={table.ruling}
                    error={table.rulingError}
                    round={round}
                    seatsIn={seatsIn}
                    turn={closest}
                    onSettle={table.settleClosest}
                />
            ))
        }

        return frame(`closest-guess:${closest.dealt.id}`, strip, (
            <ClosestGuessControl
                bare
                busy={table.guessing}
                error={table.guessError}
                round={round}
                sent={seatsIn.includes(me ?? -1)}
                turn={closest}
                onGuess={table.sendGuess}
            />
        ))
    }

    if (describe !== null) {
        const questionId = describe.words[0].dealt.id;
        const ready = readySeatsOn(control, questionId).includes(describe.guesser.seat);

        const pair: TurnPair = {
            from: describe.describer,
            fromLabel: t('pubquizr.board.describes'),
            to: describe.guesser,
            toLabel: t('pubquizr.board.guesses'),
            count: t('pubquizr.board.turnOf', { number: describe.number, total: describe.total })
        };
        const strip = <TurnOrderStrip mySeat={me} pair={pair} />;

        if (me === describe.describer.seat) {
            return frame(`describe-control:${questionId}`, strip, (
                <DescribeControl
                    bare
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    holdBack={ready
                        ? null
                        : { seat: describe.guesser, message: t('pubquizr.board.notReadyYet', { name: describe.guesser.name }) }}
                    round={round}
                    turn={describe}
                    onSettle={table.settleDescribe}
                />
            ))
        }

        return frame(`describe-watch:${questionId}`, strip, (
            <DescribeWatchBoard
                awarded={awardedOn(control, questionId)}
                endsAt={endsAtOn(control, questionId)}
                mySeat={me}
                ready={ready}
                turn={describe}
                onReady={() => sayReady(questionId)}
            />
        ))
    }

    if (list !== null) {
        const questionId = list.dealt.id;
        const readers = seats.filter(seat => seat.seat !== list.quizmaster.seat);
        const ready = readySeatsOn(control, questionId);
        // The rules are read out once, before the round's first turn, and never again.
        const firstTurn = list.number === 1;
        const waitingOn = firstTurn ? readers.find(seat => !ready.includes(seat.seat)) ?? null : null;

        const pair: TurnPair = {
            from: list.quizmaster,
            fromLabel: t('pubquizr.board.quizmaster'),
            to: list.guesser,
            toLabel: t('pubquizr.board.guesses'),
            count: t('pubquizr.board.turnOf', { number: list.number, total: list.total })
        };
        const strip = <TurnOrderStrip mySeat={me} pair={pair} />;

        if (me === list.quizmaster.seat) {
            const done = readers.filter(seat => ready.includes(seat.seat)).length;

            return frame(`list-control:${questionId}`, strip, (
                <ListControl
                    bare
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    holdBack={waitingOn === null
                        ? null
                        : { seat: waitingOn, message: t('pubquizr.board.readyCount', { done, total: readers.length }) }}
                    round={round}
                    turn={list}
                    onSettle={table.settleList}
                />
            ))
        }

        return frame(`list-watch:${questionId}`, strip, (
            <ListWatchBoard
                awardedIds={awardedIdsOn(control, questionId)}
                endsAt={endsAtOn(control, questionId)}
                kind={kind}
                mySeat={me}
                opening={firstTurn}
                readers={readers}
                ready={ready}
                turn={list}
                onReady={() => sayReady(questionId)}
            />
        ))
    }

    // Round 6 is the one round a player chooses their own question, and they choose it on their own phone.
    if (asking !== null && asking.answering !== null && asking.quizmaster !== null) {
        const order: TurnOrder = {
            label: t('pubquizr.board.quizmaster'),
            lead: asking.quizmaster,
            count: t('pubquizr.board.turnOf', { number: session.currentPosition + 1, total: session.turnsInRound }),
            path: [],
            current: null,
            missed: []
        };
        const strip = <TurnOrderStrip mySeat={me} order={order} />;

        if (me === asking.answering.seat) {
            return frame(`doubledown-control:${session.currentPosition}`, strip, (
                <DoubleDownControl
                    bare
                    answering={asking.answering}
                    busy={table.ruling}
                    error={table.rulingError}
                    number={session.currentPosition + 1}
                    pool={asking.pool}
                    quizmaster={asking.quizmaster}
                    round={round}
                    total={session.turnsInRound}
                    onChoose={table.chooseDoubleDown}
                />
            ))
        }

        return frame(`doubledown-watch:${session.currentPosition}`, strip, <DoubleDownWatchBoard answering={asking.answering} />, true);
    }

    // A round this build cannot draw a board for: say whose it is rather than nothing.
    return frame(`spotlight:${round}`, null, (
        <BoardSpotlight seat={master} title={kind} message={brief} />
    ), true)
}

const useStyles = createThemedStyles(() => ({
    // `SlideFadeIn` only animates, so without this every screen here is only as tall as its content.
    fill: {
        flex: 1,
        width: '100%'
    },

    // The band gets gutters of its own here, because `RoundStandings` lays its own down.
    band: {
        width: '100%',
        flexShrink: 0,
        paddingHorizontal: Spacing.four
    }
}))
