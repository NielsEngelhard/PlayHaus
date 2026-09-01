import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
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
import { hotSeatTurnOf, ROUND_CHOICE, ROUND_OPEN } from "@/features/pubquizr/hot-seat";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { finaleTurnOf, finalistsOf, finalStandingsOf, ROUND_FINALE } from "@/features/pubquizr/round-six";
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
const PLAYABLE = [ROUND_OPEN, ROUND_CHOICE, ROUND_CLOSEST, ROUND_DESCRIBE, ROUND_LIST, ROUND_FINALE];

/**
 * The evening as a track: one segment per round, filled as far as `through`.
 *
 * Deliberately not one segment per question. `TurnStrip` is already counting the questions
 * in this round, a few points below and with the number spelled out beside them — drawing
 * the same eight steps again up here would be one fact said twice. Rounds are what the
 * label beside the track is about, and the pair then says where you are in the evening and
 * where you are in the round.
 *
 * `through` is a count of rounds behind you rather than "the round you are on", because
 * the screens that draw this do not agree on what that would mean: a board stands inside
 * the round it is drawing, so that round is under way and fills, while the scoreboard
 * stands in front of one that has not started, so the fill stops at the round behind it.
 * Made an argument, so the off-by-one is settled once here rather than at each call site.
 *
 * Every segment is `played` or `upcoming` and never `won` or `lost`: the header cannot say
 * how a round went, because a round is a table's worth of scores rather than a verdict.
 */
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

/**
 * The three lines that change from round to round, written out per round.
 *
 * A switch rather than a lookup table, and the `t` calls are inline rather than the keys
 * being stored: an interpolated key has to be a literal at the call site for the
 * catalogue's own types to check that `{{name}}` is a thing that line takes. Stored in a
 * map they widen to "some key or other" and the check goes away, which is the check worth
 * having here — `job` is the only one of the three that interpolates.
 *
 * Together in one function because they are read together, on the hand-off screen one
 * under the other. A round whose label says "multiple choice" while its rule still talks
 * about staying in the seat is the sort of thing nobody notices until a table is arguing.
 *
 * `lead` joined them when the turn banner became `TurnStrip`. Rounds 3 and 4 have nobody
 * in the answering half of that strip, so the strip says what the round is doing instead
 * — and only the round knows what that is.
 */
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
        case ROUND_FINALE:
            return { kind, rule, brief, lead: t('pubquizr.play.leadFinale', { name }), job: t('pubquizr.play.handoff.jobFinale', { name }) };
        default:
            return { kind, rule, brief, lead: t('pubquizr.play.leadOpen', { name }), job: t('pubquizr.play.handoff.jobOpen', { name }) };
    }
}

/**
 * A pub quiz, played on one phone.
 *
 * This file is the router and the gates every round goes through; the rounds
 * themselves are three boards next door. Nothing here decides anything about the game —
 * whose turn it is, what a turn is worth and who reads next all come back from the server
 * on every ruling — it chooses which frame to draw and when to stop and ask.
 *
 * The four gates are the whole reason this is not simply a board:
 *
 * The **result** stands after every round 3 settle. The answer, the numbers and the
 * ruling would otherwise all leave the screen in the frame the phone starts moving in,
 * which leaves the table to relay what happened from memory over the next hand-off.
 *
 * The **scoreboard** stands between every round. A round has to end with something, and
 * the table needs the beat: the phone changes hands, the scores get read out, and the
 * next round starts when everybody is ready rather than the instant the last answer is
 * marked.
 *
 * The **intro** stands at the top of every round, the scoreboard included and round 1
 * especially. Every round changes the game — a hot seat becomes four options, then a
 * number everybody guesses, then a stopwatch — and the hand-off behind it is read by
 * one person with the phone already in their hand. The table needs to be told too.
 *
 * The **hand-off** stands wherever the phone changes hands. This screen carries the
 * answers, so the moment it moves is the moment the game can be spoiled, and a notice
 * that could be scrolled past would eventually be scrolled past.
 */
export default function OneDeviceQuizPage() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const router = useRouter();

    // Claims the viewport: no bottom bar, no page scroller, and the board can size
    // itself to the window the way the design draws it. Called before every early
    // return below, so the hook order never changes.
    useChromeless();

    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
    const game = useQuizSession(sessionId);

    /**
     * Whether the person holding the phone has said so.
     *
     * Keyed by seat rather than a boolean, and that is what makes it work without any
     * bookkeeping: the hand-off is showing exactly when this does not match whoever the
     * turn belongs to, so the phone changing hands puts it back up on its own. It starts
     * unset, so a round opens on a hand-off — the first quizmaster has to be handed the
     * phone too.
     */
    const [claimedBy, setClaimedBy] = useState<number | null>(null);
    /** Who last held it, for the two avatars on the hand-off. */
    const [handedFrom, setHandedFrom] = useState<number | null>(null);
    /**
     * The last round the table said it was ready for.
     *
     * Same shape as `claimedBy` and for the same reason: the scoreboard is showing
     * exactly when this does not match the round the session is on, so a round ending
     * puts it up without anything having to remember to.
     */
    const [startedRound, setStartedRound] = useState<number | null>(null);
    /**
     * The last round the table has been told what it is about to play.
     *
     * A third of the same shape, and it has to be its own rather than reusing
     * `startedRound`: round 1 has no scoreboard in front of it, so nothing ever sets
     * that one at the top of the first round, and the intro is exactly the screen round
     * 1 needs most.
     */
    const [introducedRound, setIntroducedRound] = useState<number | null>(null);
    /**
     * Round 3's last settled question, captured off the settle itself — by the time the
     * screen that shows it paints, the table has moved on and neither the numbers that
     * were typed in nor who was nearest could be worked out again.
     *
     * Cleared by the screen's own button, which is what lets the turn carry on to the
     * hand-off. Held across the settle rather than shown straight away: it goes up once
     * the session stops naming that question, so a refused settle leaves the board where
     * it was, with its error, rather than announcing a result that never happened.
     */
    const [closestResult, setClosestResult] = useState<ClosestResult | null>(null);

    function leave() {
        // `replace`, not `back`: this screen is reached from the setup form, and going
        // back to it would offer to start a second game of the one just left.
        router.replace(ROUTES.quizzerIndex);
    }

    /** The table says it has read the scores and is ready for what comes next. */
    function startRound(next: number) {
        setStartedRound(next);
        // A new round is a new person holding the phone, always: it opens on whoever is
        // furthest behind. Clearing this puts the hand-off up rather than dropping the
        // table straight onto a board somebody else should be holding.
        setClaimedBy(null);
        setHandedFrom(null);
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

    /*
     * The evening is over. `RoundStandings`' own dead end below is for a round this
     * build cannot draw — a table that finished round 6 is not that, it finished the
     * whole quiz, and it gets the screen that says so and ranks it rather than being
     * told a round it will never see is not built yet.
     */
    if (session.status === 'completed') {
        return (
            <FinalResultsScreen
                standings={finalStandingsOf(session)}
                onLeave={leave}
            />
        )
    }

    /*
     * Round 3 stops on its result before it moves anywhere else.
     *
     * In front of the scoreboard as well as the hand-off, because the question that ends
     * the round is a question like any other: the table gets told who was right, and only
     * then does the round get counted up.
     *
     * `turnQuestionIds` is what says the settle landed — the server naming a different
     * question is the table having moved on. A refused one leaves this closed and the
     * board up, which is where the error belongs.
     */
    if (closestResult !== null && !session.turnQuestionIds.includes(closestResult.dealtId)) {
        return (
            <ClosestResultScreen
                result={closestResult}
                onContinue={() => setClosestResult(null)}
            />
        )
    }

    /*
     * The scoreboard between rounds.
     *
     * Only at the top of one — a reload halfway through a round should put the table back
     * where it was, not make them sit through the standings again. Round 1 is exempt
     * because there is nothing behind it to stand on.
     */
    const between = round > ROUND_OPEN
        && session.currentPosition === 0
        && startedRound !== round;

    if (between || !playable) {
        return (
            <>
                {/*
                  * The band gets gutters of its own here rather than the board's, because
                  * `RoundStandings` below already lays its own down — one padded frame
                  * around both would give the scoreboard two sets of them. Without any it
                  * had none, which is what put the leave button hard against the glass:
                  * the band's bleed cancels out to wherever its parent's padding edge is,
                  * so a parent with no padding lines it up on nothing. See `InGameHeader`.
                  */}
                <View style={styles.band}>
                    <InGameHeader
                        onClose={leave}
                        closeLabel={t('pubquizr.play.close')}
                        label={t('pubquizr.play.standings.label', {
                            round: ordinal - 1,
                            total: session.totalRounds
                        })}
                        // The round about to start has not started, so the track stops at
                        // the one behind it. This screen is the gap between the two.
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
    const finale = finaleTurnOf(session, quiz);

    // Whoever is holding the phone this turn, and how far into the round they are. Every
    // round has both; only which board draws them changes. What the turn is worth used to
    // be read here too, for the progress card this page no longer draws — each board now
    // takes it off its own turn on the way into `TurnStrip`.
    const holder = hotSeat?.quizmaster ?? closest?.quizmaster ?? describe?.describer
        ?? list?.quizmaster ?? finale?.quizmaster ?? null;
    const number = hotSeat?.number ?? closest?.number ?? describe?.number
        ?? list?.number ?? finale?.number ?? 0;

    // A round the session says it is on but no board can draw is a deal this build does
    // not understand — a game dealt before these rounds existed, most likely. The
    // scoreboard is the honest place to stop, the same as when the rounds run out.
    if (holder === null) {
        return (
            <>
                {/* The scoreboard again, so the band it wears is the scoreboard's. The
                    label used to be empty here, which drew the band as a bare coloured
                    strip with a button in it — the one screen in the game that could not
                    say where in the evening it had stopped. */}
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

    /*
     * The round explains itself before anybody is handed the phone.
     *
     * Only at the top of a round, the same `currentPosition === 0` the scoreboard uses
     * and for the same reason: a reload halfway through should put the table back where
     * it was rather than start the round over with a lecture. After the scoreboard
     * rather than in front of it — the scores are the end of the round just played, and
     * this is the start of the next one.
     *
     * Behind the `holder === null` fallback above on purpose, so a round this build
     * cannot draw is never introduced and then abandoned.
     */
    if (introducedRound !== round && session.currentPosition === 0) {
        // The finale only: by the time round 6 opens, the server has already cut the
        // table down to two players and put a third in the quizmaster's chair (see
        // `finalistsOf`), and naming all three here is the whole reason this round gets
        // its own screen rather than sharing round 2's copy with a different label.
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
                    onVerdict={(correct, from) => {
                        // Remembered before the ruling goes out, because the session that
                        // comes back may well have moved the phone on — and the hand-off
                        // then wants to say who it is coming *from*.
                        setHandedFrom(from);
                        game.rule(correct);
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

            {finale !== null && (
                <HotSeatBoard
                    turn={finale}
                    seats={seats}
                    round={round}
                    lead={copy.lead}
                    busy={game.ruling}
                    error={game.rulingError}
                    onVerdict={(correct, from) => {
                        setHandedFrom(from);
                        game.ruleFinale(correct);
                    }}
                />
            )}
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The gap is the header's: its band ends on a hard line rather than in the slack the
    // old 58pt row carried inside itself, so the board keeps off it from out here.
    //
    // The sides and the bottom edge are here for a different reason — a chromeless page is
    // handed the window bare (see `useChromeless`), so the gutters the scroller used to
    // lay down belong to the board now. The band reaches back out through them.
    board: {
        flex: 1,
        width: '100%',
        gap: Spacing.three - 4,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    // The board's gutters and nothing else, for a screen whose body lays down its own.
    // `flexShrink` because the scoreboard beside it is a `flex: 1` and would otherwise
    // take the band's height off it before giving up any of its own.
    band: {
        width: '100%',
        flexShrink: 0,
        paddingHorizontal: Spacing.four
    },

    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.six
    }
}))
