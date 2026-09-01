import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import SettingsPageBase from "@/components/layout/SettingsPageBase";
import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import ActionButton from "@/components/ui/ActionButton";
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
import QuizRow from "@/features/pubquizr/components/QuizRow";
import TablePreview from "@/features/pubquizr/components/TablePreview";
import TableRecap from "@/features/pubquizr/components/TableRecap";
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
import { Keyboard, View } from "react-native";

/** The seats a fresh table starts with: the fewest the server will open a game for. */
const EMPTY_TABLE: string[] = Array.from({ length: MIN_PLAYERS }, () => '');

/**
 * The three questions, in the order they are asked.
 *
 * Who is playing comes first because it is the one nobody can skip and the one the
 * remembered table can answer for them; the quiz second, because that is the choice
 * people came to make; the rest last, because it is the only part of the form somebody
 * can reasonably ignore.
 */
type Step = 1 | 2 | 3;

const STEPS = 3;

/** How far a step travels on its way in. Small: this is a change of subject, not of page. */
const STEP_TRAVEL = 26;

/**
 * The heading each step puts on the band, and the line it opens with underneath.
 *
 * Steps one and two reuse the labels their own controls used to carry: with one question
 * to a page the band's title *is* that label, and printing it twice would be the screen
 * asking the same thing of itself.
 */
const STEP_TITLES: Record<Step, TranslationKey> = {
    1: 'pubquizr.oneDevice.players.label',
    2: 'pubquizr.oneDevice.steps.quizTitle',
    3: 'pubquizr.oneDevice.steps.settingsTitle'
};

const STEP_INTROS: Record<Step, TranslationKey> = {
    1: 'pubquizr.oneDevice.description',
    2: 'pubquizr.oneDevice.steps.quizIntro',
    3: 'pubquizr.oneDevice.steps.settingsIntro'
};

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
 *
 * They are asked one at a time. All three used to be one scroll, and the quiz shelf
 * alone is most of a screen tall — so the seats were above the fold, the shelf was the
 * fold, and the one switch below it was found by accident if at all. A step apiece gives
 * each question the whole page and a heading of its own, and turns the start button into
 * something that only appears once there is nothing left to answer.
 *
 * Still one route, and one `SettingsPageBase`. The steps are state, not addresses: the
 * band, the table above it and the footer stay mounted while only the sheet's contents
 * change, which is what makes moving between them feel like turning a page rather than
 * loading one. It also keeps the half-filled form out of the browser's history, where
 * every entry would be a page that no longer exists.
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

    /**
     * Which question is being asked, and which way the answer to the last one left.
     *
     * The direction is kept beside the step rather than worked out from it because by
     * the time the sheet re-renders there is nothing left to compare against. It is also
     * what makes the first paint still: arriving on the screen is the router's own
     * transition, and a second slide underneath it would be one animation too many.
     */
    const [flow, setFlow] = useState<{ step: Step, travel: number }>({ step: 1, travel: 0 });
    const step = flow.step;

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

    /**
     * On to another question, forwards or back.
     *
     * Three things have to be tidied on the way, all of them because the page stays
     * mounted: the keyboard, which would otherwise still be up over a step with nothing
     * to type into; the footer's error line, which belongs to a start that failed and
     * would be sitting under a `Next` button by the time it was read; and the remembered
     * table, which must not land on a form somebody has already pressed `Next` on.
     *
     * Only the chip and the footer come through here, so the browser's own back button
     * still leaves the screen rather than stepping within it. That is what leaving has
     * always done here — the form is local until `start` — and the alternative is
     * putting half-filled steps in the history as pages that no longer exist.
     */
    function goTo(next: Step) {
        if (next === step) return;

        Keyboard.dismiss();
        seeded.current = true;
        if (error !== null) setError(null);

        setFlow(current => ({
            step: next,
            travel: next > current.step ? STEP_TRAVEL : -STEP_TRAVEL
        }));
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

    /*
     * What each step's button is waiting for.
     *
     * A step only ever guards its own question, so nothing here can strand anybody: the
     * only way back to step 3 is through the two gates in front of it, and emptying a
     * name once you are there closes step 1's again on the way past. `canStart` is still
     * checked separately, because the start button has to answer for all three.
     */
    const stepReady = step === 1
        ? problem === null
        : step === 2 ? selected.quiz !== null : canStart;

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
                title={t(STEP_TITLES[step])}
                intro={t(STEP_INTROS[step])}
                eyebrow={t('common.stepOf', { step, total: STEPS })}
                progress={{ current: step, total: STEPS }}
                back={ROUTES.quizzerIndex as RelativePathString}
                // Only from the second step on. The first one's way back really is
                // another page, and it should stay the link it has always been.
                onBack={step === 1 ? undefined : () => goTo((step - 1) as Step)}
                enterKey={String(step)}
                enterFrom={flow.travel}
                preview={<TablePreview names={names} />}
                // Grows a clause per answered question, which walking the steps does on
                // its own — there is no quiz to name until step 2 and no zen mode until
                // step 3. Left keyed on the answers rather than on the step number so a
                // quiz arriving by deep link is named straight away, which is the only
                // confirmation that the tap on the index was heard.
                previewCaption={[
                    t('common.player.seated', { players: seatedNames(names).length }),
                    selected.quiz?.title,
                    zenMode ? t('pubquizr.oneDevice.zenMode.caption') : null
                ].filter(Boolean).join(' · ')}
                error={error === null ? undefined : t(error)}
                action={step < 3 ? (
                    <ActionButton
                        size='large'
                        text={t('common.next')}
                        onPress={() => goTo((step + 1) as Step)}
                        disabled={!stepReady}
                    />
                ) : (
                    // The one accent-filled button on the flow, and it only ever appears
                    // on the step that can actually use it — so the colour still means
                    // "this starts the game" rather than "this is the button".
                    <StartGameButton
                        text={starting ? t('common.busy') : t('pubquizr.oneDevice.start')}
                        onPress={() => void start()}
                        disabled={!canStart}
                    />
                )}
            >
                {/* Above the seats rather than below them: it is the instruction for
                    filling them in, and an instruction read afterwards is a correction.
                    Its own section, and bare — it draws a card of its own. */}
                {step === 1 && (
                    <InlineNotification
                        icon="repeat"
                        color={theme.colors.mint}
                        title={t('pubquizr.oneDevice.order.title')}
                        message={t('pubquizr.oneDevice.order.message')}
                    />
                )}

                {/* A fragment so seats and complaint stay one child — one ruled section,
                    no card. The label they used to sit under is the band's title now. */}
                {step === 1 && (
                    <>
                        <PlayerSeats names={names} onChange={editNames} disabled={starting} />

                        {/* Kept beside the seats rather than sent to the footer: it is
                            about the table, and the footer's line is about the quiz that
                            failed to start. */}
                        {showProblem && (
                            <AppText style={styles.problem}>{t(problem)}</AppText>
                        )}
                    </>
                )}

                {/* Already a fenced panel of its own, so no card around it. Given the
                    whole step because it is nearly the whole of a phone screen on its
                    own — a shelf, a search field and a scroller of its own. */}
                {step === 2 && (
                    <QuizPicker quiz={selected.quiz} onSelect={selected.select} />
                )}

                {/*
                  * What the last step is actually agreeing to, before the button that
                  * commits it. Both halves are the control that set them rather than a
                  * printed copy: tapping the quiz goes back to the shelf and tapping the
                  * seats goes back to the names, so a mistake spotted here is one tap
                  * from being fixed instead of a trip back through the chip.
                  */}
                {step === 3 && (
                    <View style={styles.recap}>
                        <View>
                            <Label label={t('pubquizr.oneDevice.quiz.selected')} />

                            {selected.quiz !== null && (
                                <QuizRow quiz={selected.quiz} selected onSelect={() => goTo(2)} />
                            )}
                        </View>

                        <View>
                            <Label
                                label={t('pubquizr.oneDevice.steps.table')}
                                value={t('common.player.seated', { players: seatedNames(names).length })}
                            />

                            <TableRecap names={names} onEdit={() => goTo(1)} />
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <ToggleRow
                        flush
                        value={zenMode}
                        onChange={setZenMode}
                        label={t('pubquizr.oneDevice.zenMode.label')}
                        description={t('pubquizr.oneDevice.zenMode.description')}
                    />
                )}
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

    // The two halves of the recap and the line under them. One section rather than two,
    // because the line at the bottom is about both of the things above it.
    recap: {
        gap: Spacing.three
    },

    hint: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textMuted
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
