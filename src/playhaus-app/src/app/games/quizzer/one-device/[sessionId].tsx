import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ClosestBoard from "@/features/pubquizr/components/play/ClosestBoard";
import ClosestResultScreen from "@/features/pubquizr/components/play/ClosestResultScreen";
import DescribeBoard from "@/features/pubquizr/components/play/DescribeBoard";
import FinalResultsScreen from "@/features/pubquizr/components/play/FinalResultsScreen";
import HandoffScreen from "@/features/pubquizr/components/play/HandoffScreen";
import HotSeatBoard from "@/features/pubquizr/components/play/HotSeatBoard";
import ListBoard from "@/features/pubquizr/components/play/ListBoard";
import PlayHeader from "@/features/pubquizr/components/play/PlayHeader";
import RoundIntroScreen from "@/features/pubquizr/components/play/RoundIntroScreen";
import RoundStandings from "@/features/pubquizr/components/play/RoundStandings";
import { hotSeatTurnOf, ROUND_CHOICE, ROUND_OPEN } from "@/features/pubquizr/hot-seat";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { roundKindAndRule } from "@/features/pubquizr/round-copy";
import { listTurnOf, ROUND_LIST } from "@/features/pubquizr/round-five";
import { finalStandingsOf, finaleTurnOf, ROUND_FINALE } from "@/features/pubquizr/round-six";
import { closestResultOf, closestTurnOf, ROUND_CLOSEST, type ClosestResult } from "@/features/pubquizr/round-three";
import { seatAt, seatsOf, standingsOf } from "@/features/pubquizr/seats";
import { useQuizSession } from "@/features/pubquizr/useQuizSession";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/** The rounds this build can play. Past the last of them the evening stops on a board. */
const PLAYABLE = [ROUND_OPEN, ROUND_CHOICE, ROUND_CLOSEST, ROUND_DESCRIBE, ROUND_LIST, ROUND_FINALE];

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
function roundCopy(t: ReturnType<typeof useT>, round: number, name: string): RoundCopy {
    const { kind, rule, brief } = roundKindAndRule(t, round);

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
    useFullScreen();

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
            <RoundStandings
                standings={standingsOf(session)}
                round={round - 1}
                onNext={playable ? () => startRound(round) : null}
                onLeave={leave}
            />
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
            <RoundStandings
                standings={standingsOf(session)}
                round={round - 1}
                onNext={null}
                onLeave={leave}
            />
        )
    }

    const copy = roundCopy(t, round, holder.name);

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
        return (
            <RoundIntroScreen
                round={round}
                totalRounds={session.totalRounds}
                kind={copy.kind}
                brief={copy.brief}
                onStart={() => setIntroducedRound(round)}
            />
        )
    }

    if (claimedBy !== holder.seat) {
        return (
            <HandoffScreen
                quizmaster={holder}
                from={seatAt(seats, handedFrom)}
                round={round}
                job={copy.job}
                rule={copy.rule}
                number={number}
                total={session.turnsInRound}
                onReady={() => setClaimedBy(holder.seat)}
            />
        )
    }

    return (
        <View style={styles.board}>
            {/*
              * The header carries the round's name and the boards carry everything else
              * about the turn. `RoundProgress` used to sit here as a card of its own,
              * under a banner of two person cards; both are now the one strip each board
              * draws for itself — which is what lets round 3 swap it for the question
              * recap once the form is up. See `TurnStrip`.
              */}
            <PlayHeader
                onClose={leave}
                label={t('pubquizr.play.roundLabel', { round, kind: copy.kind })}
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
    board: {
        flex: 1,
        width: '100%',
    },

    message: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        paddingBottom: Spacing.six
    }
}))
