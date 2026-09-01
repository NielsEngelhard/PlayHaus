import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import SettingsPageBase from "@/components/layout/SettingsPageBase";
import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import InlineNotification from "@/components/ui/InlineNotification";
import PopupModal from "@/components/ui/PopupModal";
import StartGameButton from "@/components/ui/StartGameButton";
import TextButton from "@/components/ui/TextButton";
import ToggleRow from "@/components/ui/ToggleRow";
import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import PlayerSeats from "@/features/pubquizr/components/PlayerSeats";
import QuizPicker from "@/features/pubquizr/components/QuizPicker";
import TablePreview from "@/features/pubquizr/components/TablePreview";
import { MIN_PLAYERS, seatedNames, tableProblem } from "@/features/pubquizr/one-device-table";
import { quizErrorMessage } from "@/features/pubquizr/pubquizr-errors";
import {
    abandonSingleDeviceSessionRequest,
    getCurrentSingleDeviceSessionRequest,
    startSingleDeviceQuizRequest,
    type QuizSession
} from "@/features/pubquizr/pubquizr-sessions";
import { readTable, writeTable } from "@/features/pubquizr/table-store";
import { useSelectedQuiz } from "@/features/pubquizr/useSelectedQuiz";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

/** The seats a fresh table starts with: the fewest the server will open a game for. */
const EMPTY_TABLE: string[] = Array.from({ length: MIN_PLAYERS }, () => '');

/**
 * Setting up a quiz for one table sharing one phone.
 *
 * Everything on this screen is local until `Start`, which is what creates the session on
 * the server — so backing out and coming back gives you the form again, and nothing
 * exists until you commit.
 *
 * Except when there is already a quiz. A table keeps one evening at a time, and starting
 * one throws every other session away — so this screen asks the server first, and a
 * table that left a quiz running is asked what to do about it before the form behind the
 * question can quietly destroy it. Same shape, and the same reasoning, as the League of
 * Letters settings screen.
 *
 * Two things are being asked for, and only one of them is obvious. The quiz is a choice
 * off a shelf. The players are a *seating order*: the phone is passed round the table as
 * the quiz master role moves, so the order the names go in is the order the phone
 * travels, which is why the note above the seats says so out loud.
 */
export default function OneDeviceQuizerSetup() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // `SettingsPageBase` claims this too, but only once it is on screen. Claimed here as
    // well — before the early return below — so the app header does not paint for the
    // length of the check and then leave. Called before every early return, so the hook
    // order never changes.
    useChromeless();

    const router = useRouter();

    // Handed over by `QuizRow` on the index: tapping a quiz there is the same journey as
    // pressing "one device", with the choice already made.
    const { quizId } = useLocalSearchParams<{ quizId?: string }>();
    const selected = useSelectedQuiz(quizId);

    const { status } = useAuth();
    const [names, setNames] = useState<string[]>(EMPTY_TABLE);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [zenMode, setZenMode] = useState(false);
    /** False until the server has said whether a quiz is already running. */
    const [checked, setChecked] = useState(false);
    /** The quiz that was already running, until the table has said what to do with it. */
    const [running, setRunning] = useState<QuizSession | null>(null);
    const [abandoning, setAbandoning] = useState(false);
    /** Kept apart from `error`, which belongs to the form the modal is sitting on top of. */
    const [abandonError, setAbandonError] = useState<TranslationKey | null>(null);

    // Nothing may touch state after unmount — starting the quiz navigates away while
    // the request that caused it may still be settling.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * Last week's table, if this phone remembers one.
     *
     * Seeded once and only into an untouched form: the read is asynchronous, and a
     * person who started typing before it came back must not have their first name
     * overwritten by a group they are no longer playing with.
     */
    const seeded = useRef(false);
    useEffect(() => {
        void (async () => {
            const remembered = await readTable();
            if (!mounted.current || seeded.current || remembered === null) return;

            seeded.current = true;
            setNames(current => current.some(name => name !== '')
                ? current
                : padToMinimum(remembered));
        })();
    }, []);

    // Only a signed-in session has a quiz to find; while the session is being restored
    // there is nothing to ask about yet.
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        // Asking on mount and acting on the answer is the whole job. Every state change
        // happens after the `await`, never on the way in, so nothing cascades in the
        // render this effect belongs to.
        void (async () => {
            let found: QuizSession | null = null;
            try {
                found = await getCurrentSingleDeviceSessionRequest();
            } catch {
                // The check failing is not worth stopping on: the form below still works,
                // and starting a quiz from it replaces whatever was there — which is what
                // would have happened before this screen ever asked.
            }

            if (!mounted.current) return;

            // Both outcomes end the wait. A quiz that was found is put to the table as a
            // question over the form rather than acted on for them: an evening halfway
            // through is a lot to lose to a screen somebody only meant to look at.
            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the table they left. */
    function resume(session: QuizSession) {
        // `replace`, not `push`: this screen would send the quizmaster straight back to
        // the game they just left, so it must not be behind it.
        router.replace(ROUTES.quizzerOneDeviceSession(session.id) as RelativePathString);
    }

    /**
     * Throw the running quiz away and stay here. What is left behind the closing modal is
     * the form, which is now free to seat a new table out of nothing.
     */
    async function abandon(session: QuizSession) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await abandonSingleDeviceSessionRequest(session.id);
            if (!mounted.current) return;

            setRunning(null);
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure. Closing it would leave the table looking at a form
            // that still cannot be used without destroying the quiz they just failed to
            // destroy, with nothing on screen saying so.
            setAbandonError(quizErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    function editNames(next: string[]) {
        // Any edit at all takes the form out of the running for the remembered table
        // above, whichever of the two got here first.
        seeded.current = true;
        setNames(next);

        // The line under the seats is about what is in them right now, so a table that
        // has just been fixed should stop being complained about before it is sent.
        if (error !== null) setError(null);
    }

    // Checked here rather than only on submit, because both answers are worth showing
    // before the button is pressed: what is wrong with the table, and — through the
    // button's own state — that nothing is.
    const problem = tableProblem(names);
    const canStart = problem === null && selected.quiz !== null && !starting;

    // A form nobody has started filling in is not yet a mistake, so the line under the
    // seats waits for a first name before it says anything. The button is grey either
    // way, which is the quieter half of the same answer.
    const showProblem = problem !== null && seatedNames(names).length > 0;

    async function start() {
        if (starting || selected.quiz === null || problem !== null) return;

        setStarting(true);
        setError(null);

        const seats = seatedNames(names);

        try {
            const session = await startSingleDeviceQuizRequest(selected.quiz.id, seats, zenMode);

            // Written only once the server has taken them. Remembering a table that was
            // refused would hand the same rejected names back next week.
            void writeTable(seats);

            // Only the id travels. Everything else about the session — who is in which
            // seat, what the evening will play, whose turn it is to read — is the
            // server's answer, and the play screen reads it off the session it fetches
            // rather than off what this screen happened to ask for.
            router.push(ROUTES.quizzerOneDeviceSession(session.id) as RelativePathString);
        } catch (failure) {
            if (!mounted.current) return;

            setError(quizErrorMessage(failure));
        } finally {
            if (mounted.current) setStarting(false);
        }
    }

    // Held back until the answer is in. A form that appears on its own and then has a
    // panel drop over it a moment later reads as a misfire, and for the length of that
    // moment it is a form whose only outcome would be destroying a quiz.
    if (!checked) {
        return <LoadingPage message={t('pubquizr.oneDevice.loading')} />;
    }

    return (
        <View style={styles.container}>
            <SettingsPageBase
                game={PUBQUIZR}
                title={t('pubquizr.oneDevice.title')}
                intro={t('pubquizr.oneDevice.description')}
                back={ROUTES.quizzerIndex as RelativePathString}
                preview={<TablePreview names={names} />}
                previewCaption={[
                    t('common.player.seated', { players: seatedNames(names).length }),
                    selected.quiz?.title,
                    zenMode ? t('pubquizr.oneDevice.zenMode.caption') : null
                ].filter(Boolean).join(' · ')}
                error={error === null ? undefined : t(error)}
                action={
                    <StartGameButton
                        text={starting ? t('common.busy') : t('pubquizr.oneDevice.start')}
                        onPress={() => void start()}
                        disabled={!canStart}
                    />
                }
            >
                {/* Above the seats rather than below them: it is the instruction for
                    filling them in, and an instruction read afterwards is a correction.
                    Its own section, and bare — it draws a card of its own. */}
                <InlineNotification
                    icon="repeat"
                    color={theme.colors.mint}
                    title={t('pubquizr.oneDevice.order.title')}
                    message={t('pubquizr.oneDevice.order.message')}
                />

                {/* A fragment so label, seats and complaint stay one child — one ruled
                    section, no card. */}
                <>
                    <Label label={t('pubquizr.oneDevice.players.label')} />

                    <PlayerSeats names={names} onChange={editNames} disabled={starting} />

                    {/* Kept beside the seats rather than sent to the footer: it is about
                        the table, and the footer's line is about the quiz that failed to
                        start. */}
                    {showProblem && (
                        <AppText style={styles.problem}>{t(problem)}</AppText>
                    )}
                </>

                {/* Already a fenced panel of its own, so no card around it. */}
                <QuizPicker quiz={selected.quiz} onSelect={selected.select} />

                <ToggleRow
                    flush
                    value={zenMode}
                    onChange={setZenMode}
                    label={t('pubquizr.oneDevice.zenMode.label')}
                    description={t('pubquizr.oneDevice.zenMode.description')}
                />
            </SettingsPageBase>

            {/*
              * Sits over the form until the running quiz has been dealt with one way or
              * the other. No dismissal: both ways out are on it, and a third that just put
              * the table back on a form they cannot safely use would not be one.
              */}
            <PopupModal
                visible={running !== null}
                title={t('pubquizr.oneDevice.running.title')}
                message={t('pubquizr.oneDevice.running.message')}
            >
                {abandonError !== null && (
                    <AppText style={styles.abandonError}>{t(abandonError)}</AppText>
                )}

                <TextButton
                    text={t('pubquizr.oneDevice.running.resume')}
                    variant='primary'
                    fullWidth
                    disabled={abandoning}
                    // `running` cannot be null while the modal is up, but the close
                    // animation outlives it — so the buttons have to survive it too.
                    onPress={() => running && resume(running)}
                />

                <TextButton
                    text={abandoning ? t('common.busy') : t('pubquizr.oneDevice.running.discard')}
                    variant='muted'
                    fullWidth
                    disabled={abandoning}
                    onPress={() => running && void abandon(running)}
                />
            </PopupModal>
        </View>
    )
}

/**
 * A remembered table, back up to the minimum number of chairs.
 *
 * A stored row can be shorter than `MIN_PLAYERS` — the rules can move, and so can what
 * an older build wrote — and `PlayerSeats` is promised at least that many seats.
 */
function padToMinimum(names: string[]): string[] {
    return names.length >= MIN_PLAYERS
        ? names
        : [...names, ...Array.from({ length: MIN_PLAYERS - names.length }, () => '')];
}

const useStyles = createThemedStyles(theme => ({
    // Only here to pass the window's height through to the base, which is the page.
    container: {
        flex: 1,
        width: '100%'
    },

    problem: {
        // The section lays its children out with no gap of its own, so the line has to
        // keep itself off the last seat.
        marginTop: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    abandonError: {
        // Inside the modal, where the form's own `InlineNotification` would be a card
        // within a card. The panel is already the thing being looked at, so the line only
        // has to be readable and the wrong colour for good news.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
