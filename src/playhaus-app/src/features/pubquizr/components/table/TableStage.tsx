import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import TableAnswer from "@/features/pubquizr/components/table/TableAnswer";
import TableClosestProgress from "@/features/pubquizr/components/table/TableClosestProgress";
import TableClosestResult from "@/features/pubquizr/components/table/TableClosestResult";
import TableFinalists from "@/features/pubquizr/components/table/TableFinalists";
import TableFinalResults from "@/features/pubquizr/components/table/TableFinalResults";
import TableList from "@/features/pubquizr/components/table/TableList";
import TableOptions from "@/features/pubquizr/components/table/TableOptions";
import TableQuestion from "@/features/pubquizr/components/table/TableQuestion";
import TableRoundIntro from "@/features/pubquizr/components/table/TableRoundIntro";
import TableStandings from "@/features/pubquizr/components/table/TableStandings";
import TableTimer from "@/features/pubquizr/components/table/TableTimer";
import TableWaiting from "@/features/pubquizr/components/table/TableWaiting";
import { hotSeatTurnOf, isHotSeatRound, ROUND_CHOICE } from "@/features/pubquizr/hot-seat";
import {
    awardedIdsOn,
    awardedOn,
    endsAtOn,
    missedSeatsOf,
    picksOf,
    roundOpenOn,
    type ControlState
} from "@/features/pubquizr/multi-device/control";
import type { QuizDetail } from "@/features/pubquizr/pubquizr-quizzes";
import type { PQClosestProgress, PQClosestReveal, QuizSession } from "@/features/pubquizr/pubquizr-sessions";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { finaleTurnOf, finalistsOf, finalStandingsOf, ROUND_FINALE } from "@/features/pubquizr/round-seven";
import { doubleDownTurnOf, ROUND_DOUBLE_DOWN } from "@/features/pubquizr/round-six";
import { closestRevealOf, closestTurnOf, ROUND_CLOSEST } from "@/features/pubquizr/round-three";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";
import { seatAt, seatsOf, standingsOf, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** How far round 3's typing has got, and null in every other round. */
    closest: PQClosestProgress | null
    /** Everything the phones have said about the question the table is on. */
    control: ControlState
    quiz: QuizDetail
    /** Round 3's result while the room is still showing it. */
    reveal: PQClosestReveal | null
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    session: QuizSession
}

// The only per-round logic on the shared screen. Every branch reads, and none of them can be pressed.
export default function TableStage({ closest, control, quiz, reveal, scale, session }: Props) {
    const styles = useStyles();
    const t = useT();

    if (session.status === 'completed') {
        return <TableFinalResults scale={scale} standings={finalStandingsOf(session)} />;
    }

    // Before the round, because a result is about a question that is over and the table has already moved past it.
    const result = reveal === null ? null : closestRevealOf(session, quiz, reveal);
    if (result !== null) return <TableClosestResult result={result} scale={scale} />;

    const round = session.currentRound;
    const seats = seatsOf(session);

    // A round states itself until the phone that reads its questions says go, which is the one moment the table is between questions rather than on one.
    if (session.currentPosition === 0 && !roundOpenOn(control, round)) {
        const { brief, kind } = roundKindAndRule(t, round, session.zenMode);

        return (
            <TableRoundIntro
                brief={brief}
                finalists={round === ROUND_FINALE ? finalistsOf(session, seats) : null}
                kind={kind}
                quizmaster={seatAt(seats, session.quizMasterSeat)}
                round={roundOrdinalOf(session)}
                scale={scale}
                totalRounds={session.totalRounds}
            >
                {/* Nothing to stand on until a round has been played. */}
                {seats.some(seat => seat.score !== 0) && (
                    <TableStandings scale={scale} standings={standingsOf(session)} />
                )}
            </TableRoundIntro>
        )
    }

    // Rounds 1, 2, 6 and 7 are the same question down a different line, and the screen draws all four the same way.
    const hotSeat = isHotSeatRound(round)
        ? hotSeatTurnOf(session, quiz)
        : round === ROUND_FINALE
            ? finaleTurnOf(session, quiz)
            // Round 6 has no question at all until the player has asked for one.
            : round === ROUND_DOUBLE_DOWN
                ? doubleDownTurnOf(session, quiz, session.activeQuestionId ?? null)
                : null;

    if (hotSeat !== null) {
        const missed = missedSeatsOf(control, hotSeat.dealt.id)
            .map(seat => seatAt(seats, seat))
            .filter((seat): seat is Seat => seat !== null);

        const revealed = control.questionId === hotSeat.dealt.id && control.revealed;
        // The finale is the one round the table wants both names at once, which the roles corner cannot give them.
        const finalists = round === ROUND_FINALE ? finalistsOf(session, seats) : null;

        return (
            <TableQuestion
                number={hotSeat.number}
                prompt={hotSeat.question.prompt}
                scale={scale}
                total={hotSeat.total}
                worth={hotSeat.worth}
            >
                {finalists !== null && <TableFinalists finalists={finalists} scale={scale} />}

                {round === ROUND_CHOICE
                    // Round 2's misses are painted on the options they were spent on, so it never wants the row as well.
                    ? (
                        <TableOptions
                            options={hotSeat.options}
                            picks={picksOf(control, hotSeat.dealt.id)}
                            scale={scale}
                            seats={seats}
                        />
                    )
                    : missed.length > 0 && <Missed missed={missed} scale={scale} />}

                {revealed && (
                    <TableAnswer
                        aliases={hotSeat.aliases}
                        answer={hotSeat.answer}
                        label={t('pubquizr.table.answer')}
                        scale={scale}
                    />
                )}
            </TableQuestion>
        )
    }

    // Round 6 before anybody has picked: whose choice it is, and nothing of the question, because there is not one yet.
    if (round === ROUND_DOUBLE_DOWN) {
        const asking = seatAt(seats, session.answeringSeat);

        return (
            <TableWaiting
                message={asking === null
                    ? t('pubquizr.table.followPhones')
                    : t('pubquizr.table.choosing', { name: asking.name })}
                scale={scale}
                seat={asking}
            />
        )
    }

    const closestTurn = round === ROUND_CLOSEST ? closestTurnOf(session, quiz) : null;

    if (closestTurn !== null) {
        // A frame about an earlier question says nothing about this one.
        const seatsIn = closest !== null && closest.sessionQuestionId === closestTurn.dealt.id
            ? closest.seatsIn
            : [];

        return (
            <TableQuestion
                number={closestTurn.number}
                prompt={closestTurn.question.prompt}
                scale={scale}
                total={closestTurn.total}
                worth={closestTurn.worth}
            >
                <TableClosestProgress
                    guessing={closestTurn.guessing}
                    scale={scale}
                    seatsIn={seatsIn}
                />
            </TableQuestion>
        )
    }

    const describe = round === ROUND_DESCRIBE ? describeTurnOf(session, quiz) : null;

    if (describe !== null) {
        // Every frame this turn sends is about the first word, which is the id `turnQuestionIds` leads with.
        const questionId = describe.words[0].dealt.id;
        const endsAt = endsAtOn(control, questionId);
        const awarded = awardedOn(control, questionId);
        const { brief, kind } = roundKindAndRule(t, round, session.zenMode);

        return (
            <TableRoundIntro
                brief={brief}
                kind={kind}
                quizmaster={describe.describer}
                round={roundOrdinalOf(session)}
                scale={scale}
                totalRounds={session.totalRounds}
            >
                {endsAt !== null && <TableTimer endsAt={endsAt} scale={scale} />}

                {/* A count and never a word: the list is the describer's secret, so the rules are all the table gets. */}
                {awarded > 0 && (
                    <AppText style={[styles.count, { fontSize: Math.round(22 * scale) }]}>
                        {t('pubquizr.table.gotSoFar', { awarded, total: describe.words.length })}
                    </AppText>
                )}
            </TableRoundIntro>
        )
    }

    const list = round === ROUND_LIST ? listTurnOf(session, quiz) : null;

    if (list !== null) {
        const endsAt = endsAtOn(control, list.dealt.id);

        return (
            <TableQuestion
                number={list.number}
                prompt={list.question.prompt}
                scale={scale}
                total={list.total}
                worth={list.worth}
            >
                {endsAt !== null && <TableTimer endsAt={endsAt} scale={scale} />}

                <TableList
                    answers={list.answers}
                    awarded={awardedIdsOn(control, list.dealt.id)}
                    scale={scale}
                />
            </TableQuestion>
        )
    }

    // A round this build's screen has nothing of its own to say about yet.
    return <TableWaiting message={t('pubquizr.table.followPhones')} scale={scale} />;
}

interface MissedProps {
    missed: Seat[]
    scale: number
}

// Everybody the question has already beaten, in the order it reached them.
function Missed({ missed, scale }: MissedProps) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={[styles.row, { gap: Math.round(10 * scale) }]}>
            <AppText style={[styles.label, { fontSize: Math.round(10 * scale) }]}>
                {t('pubquizr.table.missed')}
            </AppText>

            {missed.map(seat => (
                <View key={seat.seat} style={styles.faded}>
                    <SeatAvatar seat={seat} size={Math.round(30 * scale)} />
                </View>
            ))}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    // Struck out is not a thing an avatar can be, so a miss reads as faded instead.
    faded: {
        opacity: 0.45
    },
    count: {
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    }
}))
