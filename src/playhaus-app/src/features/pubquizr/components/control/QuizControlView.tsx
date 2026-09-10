import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import type { SegmentState } from "@/components/ui/InGameHeader";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ChoicePadControl from "@/features/pubquizr/components/control/ChoicePadControl";
import ChoiceReadOut from "@/features/pubquizr/components/control/ChoiceReadOut";
import ClosestGuessControl from "@/features/pubquizr/components/control/ClosestGuessControl";
import ClosestSettleControl from "@/features/pubquizr/components/control/ClosestSettleControl";
import ControlFrame, { type ControlTurn } from "@/features/pubquizr/components/control/ControlFrame";
import ControlWaiting from "@/features/pubquizr/components/control/ControlWaiting";
import DescribeControl from "@/features/pubquizr/components/control/DescribeControl";
import DoubleDownControl from "@/features/pubquizr/components/control/DoubleDownControl";
import HotSeatControl from "@/features/pubquizr/components/control/HotSeatControl";
import ListControl from "@/features/pubquizr/components/control/ListControl";
import FinalResultsScreen from "@/features/pubquizr/components/play/FinalResultsScreen";
import RoundIntroScreen from "@/features/pubquizr/components/play/RoundIntroScreen";
import { hotSeatTurnOf, isHotSeatRound, ROUND_CHOICE } from "@/features/pubquizr/hot-seat";
import { missedSeatsOf, picksOf, roundOpenOn } from "@/features/pubquizr/multi-device/control";
import { useQuizTable } from "@/features/pubquizr/multi-device/useQuizTable";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { finaleTurnOf, finalistsOf, finalStandingsOf, ROUND_FINALE } from "@/features/pubquizr/round-seven";
import { doubleDownPoolOf, doubleDownTurnOf, ROUND_DOUBLE_DOWN } from "@/features/pubquizr/round-six";
import { closestTurnOf, ROUND_CLOSEST } from "@/features/pubquizr/round-three";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";
import { seatAt, seatsOf, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

// The evening as a track: one segment per round, filled as far as `through`.
function roundTrack(total: number, through: number): SegmentState[] {
    return Array.from({ length: total }, (_, index) => index < through ? 'played' : 'upcoming');
}

// What the strip says on a phone that is only watching: the same numbers its own board would show.
function stripOf(
    answering: Seat | null,
    quizmaster: Seat,
    round: number,
    run: number,
    turn: { number: number, total: number, worth: number }
): ControlTurn {
    // Every round with a strip on a watching phone names a seat, so it never falls back to its one-line version.
    return {
        answering,
        lead: '',
        number: turn.number,
        quizmaster,
        round,
        run,
        total: turn.total,
        worth: turn.worth
    };
}

// What a phone with nothing to press is waiting for.
function waitingMessage(t: ReturnType<typeof useT>, answering: Seat | null, mySeat: number | null): string {
    if (answering === null) return t('pubquizr.control.theScreenHasIt');
    if (answering.seat === mySeat) return t('pubquizr.control.yourTurn');

    return t('pubquizr.control.waitingFor', { name: answering.name });
}

interface Props {
    code: string
}

// The phone half of multi device. A controller and nothing more: the question, the scores and the walk are all on the shared screen.
export default function QuizControlView({ code }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();
    const router = useRouter();

    // Claims the viewport: no bottom bar, no page scroller.
    useChromeless();

    // Kept here as well as in the room, because the room relays a frame to everybody but its author.
    const [opened, setOpened] = useState<number | null>(null);

    const table = useQuizTable(code);
    const { control, quiz, session } = table;

    function leave() {
        // `replace`, not `back`: the room this was reached from is the room the evening is in.
        router.replace(ROUTES.quizzerIndex);
    }

    if (table.error !== null) {
        return (
            <View style={styles.message}>
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(table.error)}
                >
                    <TextButton text={t('common.retry')} onPress={table.reload} />
                    <TextButton text={t('common.backToGames')} variant="muted" onPress={leave} />
                </InlineNotification>
            </View>
        )
    }

    if (session === null || quiz === null) {
        return <LoadingPage message={t('pubquizr.lobby.dealt')} />;
    }

    if (session.status === 'completed') {
        return <FinalResultsScreen standings={finalStandingsOf(session)} onLeave={leave} />;
    }

    const seats = seatsOf(session);
    const ordinal = roundOrdinalOf(session);
    const { brief, kind } = roundKindAndRule(t, session.currentRound, session.zenMode);
    const label = t('pubquizr.play.roundLabel', { round: ordinal, kind });
    const segments = roundTrack(session.totalRounds, ordinal);

    const round = session.currentRound;

    // The question the round opens on, which is the one a gate frame is authored about.
    const [opening] = session.turnQuestionIds;
    const master = seatAt(seats, session.quizMasterSeat);

    // A round states itself before it starts, and the phone that reads the questions is the one that says go.
    if (session.currentPosition === 0 && opening !== undefined && master !== null
        && opened !== round && !roundOpenOn(control, round)) {
        if (table.mySeat === master.seat) {
            return (
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
            )
        }

        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <ControlWaiting
                    message={t('pubquizr.control.roundStarting', { name: master.name })}
                    prompt={null}
                    seat={master}
                />
            </ControlFrame>
        )
    }

    // Rounds 1, 2 and 7 are the same question down a different line, and only round 2 changes who judges it.
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

    // And before that it is a choice rather than a question, made on the phone whose turn it is.
    const asking = round === ROUND_DOUBLE_DOWN && doubleDown === null
        ? {
            answering: seatAt(seats, session.answeringSeat),
            pool: doubleDownPoolOf(session, quiz),
            quizmaster: seatAt(seats, session.quizMasterSeat)
        }
        : null;

    // Whose numbers the server has for the question the table is on; a frame about an earlier one says nothing about this.
    const seatsIn = closest !== null && table.closest !== null
        && table.closest.sessionQuestionId === closest.dealt.id
        ? table.closest.seatsIn
        : [];

    // Rounds 1, 2, 6 and 7 all send one question down a line, and the walk reads the same in all four.
    const walking = hotSeat ?? doubleDown;
    // How far the walk has got, off the frames the room kept -- which is the walk the screen is drawing too.
    const walked = walking === null ? 0 : missedSeatsOf(control, walking.dealt.id).length;
    // Whoever the question is with now. Round 2's pad sits on that phone, so it cannot wait until after the branches.
    const asked = walking === null ? null : walking.remaining[walked] ?? walking.answering;

    // Round 2 is scored on the answerer's own phone, which is the one round where the pad follows the walk instead of a seat.
    if (hotSeat !== null && round === ROUND_CHOICE && asked !== null && table.mySeat === asked.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <ChoicePadControl
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    missed={walked}
                    picks={picksOf(control, hotSeat.dealt.id)}
                    round={round}
                    turn={hotSeat}
                    onSettle={table.settleTurn}
                />
            </ControlFrame>
        )
    }

    // Round 2's quizmaster reads it out and judges nothing, so their phone has nothing on it to press.
    if (hotSeat !== null && round === ROUND_CHOICE && table.mySeat === hotSeat.quizmaster.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <ChoiceReadOut
                    answering={asked ?? hotSeat.answering}
                    round={round}
                    turn={hotSeat}
                />
            </ControlFrame>
        )
    }

    // The quizmaster's own walk lives on their phone, so their board brings its own strip.
    if (hotSeat !== null && round !== ROUND_CHOICE && table.mySeat === hotSeat.quizmaster.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <HotSeatControl
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    round={round}
                    turn={hotSeat}
                    onSettle={round === ROUND_FINALE ? table.settleFinale : table.settleTurn}
                />
            </ControlFrame>
        )
    }

    // The one round whose phone is still a whole board, because the words on it are its owner's secret.
    if (describe !== null && table.mySeat === describe.describer.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <DescribeControl
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    round={round}
                    turn={describe}
                    onSettle={table.settleDescribe}
                />
            </ControlFrame>
        )
    }

    if (list !== null && table.mySeat === list.quizmaster.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <ListControl
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    round={round}
                    turn={list}
                    onSettle={table.settleList}
                />
            </ControlFrame>
        )
    }

    // The reader closes round 3, and at the smallest table that is somebody who guessed too -- so their own number goes in by hand.
    if (closest !== null && table.mySeat === closest.quizmaster.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <ClosestSettleControl
                    busy={table.ruling}
                    error={table.rulingError}
                    round={round}
                    seatsIn={seatsIn}
                    turn={closest}
                    onSettle={table.settleClosest}
                />
            </ControlFrame>
        )
    }

    if (closest !== null && closest.guessing.some(seat => seat.seat === table.mySeat)) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <ClosestGuessControl
                    busy={table.guessing}
                    error={table.guessError}
                    round={round}
                    sent={seatsIn.includes(table.mySeat ?? -1)}
                    turn={closest}
                    onGuess={table.sendGuess}
                />
            </ControlFrame>
        )
    }

    // Round 6 is the one round a player chooses their own question, and they choose it on their own phone.
    if (asking !== null && asking.answering !== null && asking.quizmaster !== null
        && table.mySeat === asking.answering.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <DoubleDownControl
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
            </ControlFrame>
        )
    }

    // Once it is pinned round 6 is an open question like any other, walked and judged on the reader's phone.
    if (doubleDown !== null && table.mySeat === doubleDown.quizmaster.seat) {
        return (
            <ControlFrame label={label} onClose={leave} segments={segments} turn={null}>
                <HotSeatControl
                    busy={table.ruling}
                    emit={table.emit}
                    error={table.rulingError}
                    round={round}
                    turn={doubleDown}
                    onSettle={(missedSeats, correctSeat) => {
                        table.settleDoubleDown(doubleDown.dealt.id, missedSeats, correctSeat);
                    }}
                />
            </ControlFrame>
        )
    }

    // Rounds 4 and 5 ask one person without moving the hot seat, so they name a guesser and leave the answering seat empty.
    const answering = walking === null
        ? seatAt(seats, session.answeringSeat ?? session.guesserSeat)
        : asked;

    let turn: ControlTurn | null = null;
    if (walking !== null) {
        turn = stripOf(answering, walking.quizmaster, round, walked === 0 ? walking.run : 0, walking);
    } else if (describe !== null) {
        turn = stripOf(describe.guesser, describe.describer, round, 0, describe);
    } else if (list !== null) {
        turn = stripOf(list.guesser, list.quizmaster, round, 0, list);
    }

    return (
        <ControlFrame label={label} onClose={leave} segments={segments} turn={turn}>
            <ControlWaiting
                message={waitingMessage(t, answering, table.mySeat)}
                // Never round 4's words, which belong to the describer alone.
                prompt={walking?.question.prompt ?? list?.question.prompt ?? null}
                seat={answering}
            />
        </ControlFrame>
    )
}

const useStyles = createThemedStyles(() => ({
    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six
    }
}))
