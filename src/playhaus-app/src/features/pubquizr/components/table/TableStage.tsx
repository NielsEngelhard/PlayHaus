import { useT } from "@/features/i18n/LanguageContext";
import TableAnswer from "@/features/pubquizr/components/table/TableAnswer";
import TableClosestProgress from "@/features/pubquizr/components/table/TableClosestProgress";
import TableChoosing from "@/features/pubquizr/components/table/TableChoosing";
import TableClosestResult from "@/features/pubquizr/components/table/TableClosestResult";
import TableDescribeClock from "@/features/pubquizr/components/table/TableDescribeClock";
import TableDescribeRecap from "@/features/pubquizr/components/table/TableDescribeRecap";
import TableFinalists from "@/features/pubquizr/components/table/TableFinalists";
import TableFinalResults from "@/features/pubquizr/components/table/TableFinalResults";
import TableList from "@/features/pubquizr/components/table/TableList";
import TableMissed from "@/features/pubquizr/components/table/TableMissed";
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
    recapOn,
    roundOpenOn,
    type ControlState
} from "@/features/pubquizr/multi-device/control";
import type { QuizDetail } from "@/features/pubquizr/pubquizr-quizzes";
import type { PQClosestProgress, PQClosestReveal, QuizSession } from "@/features/pubquizr/pubquizr-sessions";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { DESCRIBE_WORD_POINTS, describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { finaleTurnOf, finalistsOf, finalStandingsOf, ROUND_FINALE } from "@/features/pubquizr/round-seven";
import { doubleDownTurnOf, ROUND_DOUBLE_DOWN } from "@/features/pubquizr/round-six";
import { closestRevealOf, closestTurnOf, ROUND_CLOSEST } from "@/features/pubquizr/round-three";
import { roundOrdinalOf } from "@/features/pubquizr/running-order";
import { seatAt, seatsOf, standingsOf, type Seat } from "@/features/pubquizr/seats";

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

        // Round 6's question carries the weight the player asked for rather than what every question of its round pays.
        const weight = hotSeat.question.difficulty;
        const note = weight === undefined ? undefined : t('pubquizr.table.weightChip', {
            weight: weight === 'hard' ? t('pubquizr.board.hard') : t('pubquizr.board.easy'),
            points: hotSeat.worth
        });

        return (
            <TableQuestion
                note={note}
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
                    : missed.length > 0 && <TableMissed missed={missed} scale={scale} />}

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
        return <TableChoosing asking={seatAt(seats, session.answeringSeat)} scale={scale} />;
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
                    done={closestTurn.guessing.filter(seat => seatsIn.includes(seat.seat)).length}
                    scale={scale}
                    total={closestTurn.guessing.length}
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
        const settled = control.questionId === questionId && control.stage === 'settling';

        // Only once the describer has ruled on the clock: until then the words are theirs alone.
        if (settled) {
            const credited = recapOn(control, questionId);
            const words = describe.words.map(word => ({
                word: word.word,
                winner: seatAt(seats, credited.find(entry => entry.id === word.dealt.id)?.seat ?? null)
            }));

            // What the describer takes is a point per word guessed, not what the turn pays the pair of them.
            const won = words.filter(word => word.winner !== null).length * DESCRIBE_WORD_POINTS;

            return (
                <TableDescribeRecap
                    describer={describe.describer}
                    points={won === 1 ? t('pubquizr.board.onePoint') : t('pubquizr.board.pointsWorth', { points: won })}
                    scale={scale}
                    words={words}
                />
            )
        }

        return (
            <TableDescribeClock
                awarded={awarded}
                describer={describe.describer}
                endsAt={endsAt}
                guesser={describe.guesser}
                scale={scale}
                total={describe.words.length}
            />
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

