import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ClosestBoard from "@/features/pubquizr/components/play/ClosestBoard";
import DescribeBoard from "@/features/pubquizr/components/play/DescribeBoard";
import HandoffScreen from "@/features/pubquizr/components/play/HandoffScreen";
import HotSeatBoard from "@/features/pubquizr/components/play/HotSeatBoard";
import PlayHeader from "@/features/pubquizr/components/play/PlayHeader";
import RoundProgress from "@/features/pubquizr/components/play/RoundProgress";
import RoundStandings from "@/features/pubquizr/components/play/RoundStandings";
import { hotSeatTurnOf, ROUND_CHOICE, ROUND_OPEN } from "@/features/pubquizr/hot-seat";
import { describeTurnOf, ROUND_DESCRIBE } from "@/features/pubquizr/round-four";
import { closestTurnOf, ROUND_CLOSEST } from "@/features/pubquizr/round-three";
import { seatAt, seatsOf, standingsOf } from "@/features/pubquizr/seats";
import { useQuizSession } from "@/features/pubquizr/useQuizSession";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

/** The rounds this build can play. Past the last of them the evening stops on a board. */
const PLAYABLE = [ROUND_OPEN, ROUND_CHOICE, ROUND_CLOSEST, ROUND_DESCRIBE];

/** What a round is called, what its phone-holder does, and the rule they need first. */
interface RoundCopy {
    kind: string
    job: string
    rule: string
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
 */
function roundCopy(t: ReturnType<typeof useT>, round: number, name: string): RoundCopy {
    switch (round) {
        case ROUND_CHOICE:
            return {
                kind: t('pubquizr.play.rounds.choice'),
                job: t('pubquizr.play.handoff.jobChoice', { name }),
                rule: t('pubquizr.play.handoff.ruleChoice')
            };
        case ROUND_CLOSEST:
            return {
                kind: t('pubquizr.play.rounds.closest'),
                job: t('pubquizr.play.handoff.jobClosest', { name }),
                rule: t('pubquizr.play.handoff.ruleClosest')
            };
        case ROUND_DESCRIBE:
            return {
                kind: t('pubquizr.play.rounds.describe'),
                job: t('pubquizr.play.handoff.jobDescribe', { name }),
                rule: t('pubquizr.play.handoff.ruleDescribe')
            };
        default:
            return {
                kind: t('pubquizr.play.rounds.open'),
                job: t('pubquizr.play.handoff.jobOpen', { name }),
                rule: t('pubquizr.play.handoff.ruleOpen')
            };
    }
}

/**
 * A pub quiz, played on one phone.
 *
 * This file is the router and the two gates every round goes through; the rounds
 * themselves are three boards next door. Nothing here decides anything about the game —
 * whose turn it is, what a turn is worth and who reads next all come back from the server
 * on every ruling — it chooses which frame to draw and when to stop and ask.
 *
 * The two gates are the whole reason this is not simply a board:
 *
 * The **scoreboard** stands between every round. A round has to end with something, and
 * the table needs the beat: the phone changes hands, the scores get read out, and the
 * next round starts when everybody is ready rather than the instant the last answer is
 * marked.
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

    // Whoever is holding the phone this turn, and how far into the round they are. Every
    // round has all three; only which board draws them changes.
    const holder = hotSeat?.quizmaster ?? closest?.quizmaster ?? describe?.describer ?? null;
    const number = hotSeat?.number ?? closest?.number ?? describe?.number ?? 0;
    const worth = hotSeat?.worth ?? closest?.worth ?? describe?.worth ?? 0;

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
            <PlayHeader onClose={leave} />

            <RoundProgress
                round={round}
                kind={copy.kind}
                number={number}
                total={session.turnsInRound}
                worth={worth}
            />

            {hotSeat !== null && (
                <HotSeatBoard
                    turn={hotSeat}
                    seats={seats}
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
                    seats={seats}
                    busy={game.ruling}
                    error={game.rulingError}
                    onSettle={settled => {
                        setHandedFrom(closest.quizmaster.seat);
                        game.settleClosest(settled);
                    }}
                />
            )}

            {describe !== null && (
                <DescribeBoard
                    turn={describe}
                    busy={game.ruling}
                    error={game.rulingError}
                    onSettle={awards => {
                        setHandedFrom(describe.describer.seat);
                        game.settleDescribe(awards);
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
