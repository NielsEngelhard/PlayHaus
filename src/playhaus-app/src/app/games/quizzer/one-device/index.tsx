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
import QuizPicker from "@/features/pubquizr/components/QuizPicker";
import QuizRow from "@/features/pubquizr/components/QuizRow";
import TablePreview from "@/features/pubquizr/components/TablePreview";
import TableRecap from "@/features/pubquizr/components/TableRecap";
import { MAX_PLAYERS, MIN_PLAYERS, seatedNames, tableProblem } from "@/features/pubquizr/one-device-table";
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
import PlayerNamesInput from "@/components/ui/PlayerNamesInput";

const EMPTY_TABLE: string[] = Array.from({ length: MIN_PLAYERS }, () => '');

type Step = 1 | 2 | 3;

const STEPS = 3;

const STEP_TRAVEL = 26;

const STEP_TITLES: Record<Step, TranslationKey> = {
    1: 'pubquizr.oneDevice.players.label',
    2: 'pubquizr.oneDevice.steps.quizTitle',
    3: 'pubquizr.oneDevice.steps.settingsTitle'
};

export default function OneDeviceQuizerSetup() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    useChromeless();

    const router = useRouter();

    const { quizId } = useLocalSearchParams<{ quizId?: string }>();
    const selected = useSelectedQuiz(quizId);

    const { status } = useAuth();

    const [flow, setFlow] = useState<{ step: Step, travel: number }>({ step: 1, travel: 0 });
    const step = flow.step;

    const [names, setNames] = useState<string[]>(EMPTY_TABLE);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [zenMode, setZenMode] = useState(false);
    const [triviaMode, setTriviaMode] = useState(false);
    const [checked, setChecked] = useState(false);
    const [running, setRunning] = useState<QuizSession | null>(null);
    const [abandoning, setAbandoning] = useState(false);
    const [abandonError, setAbandonError] = useState<TranslationKey | null>(null);

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

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

    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        void (async () => {
            let found: QuizSession | null = null;
            try {
                found = await getCurrentSingleDeviceSessionRequest();
            } catch {
                // The check failing is not worth stopping on.
            }

            if (!mounted.current) return;

            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    function resume(session: QuizSession) {
        router.replace(ROUTES.quizzerOneDeviceSession(session.id) as RelativePathString);
    }

    // Throw the running quiz away and stay here.
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

            // Kept open on failure.
            setAbandonError(quizErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    // On to another question, forwards or back.
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
        // Any edit at all takes the form out of the running for the remembered table above, whichever of the two got here first.
        seeded.current = true;
        setNames(next);

        // The line under the seats is about what is in them right now.
        if (error !== null) setError(null);
    }

    // Checked here rather than only on submit, because both answers are worth showing before the button is pressed.
    const problem = tableProblem(names);
    const canStart = problem === null && selected.quiz !== null && !starting;

    // What each step's button is waiting for.
    const stepReady = step === 1
        ? problem === null
        : step === 2 ? selected.quiz !== null : canStart;

    // A form nobody has started filling in is not yet a mistake.
    const showProblem = problem !== null && seatedNames(names).length > 0;

    async function start() {
        if (starting || selected.quiz === null || problem !== null) return;

        setStarting(true);
        setError(null);

        const seats = seatedNames(names);

        try {
            const session = await startSingleDeviceQuizRequest(selected.quiz.id, seats, { zenMode, triviaMode });

            // Written only once the server has taken them.
            void writeTable(seats);

            // Only the id travels.
            router.push(ROUTES.quizzerOneDeviceSession(session.id) as RelativePathString);
        } catch (failure) {
            if (!mounted.current) return;

            setError(quizErrorMessage(failure));
        } finally {
            if (mounted.current) setStarting(false);
        }
    }

    // Held back until the answer is in.
    if (!checked) {
        return <LoadingPage message={t('pubquizr.oneDevice.loading')} />;
    }

    return (
        <View style={styles.container}>
            <SettingsPageBase
                game={PUBQUIZR}
                title={t(STEP_TITLES[step])}
                eyebrow={t('common.stepOf', { step, total: STEPS })}
                progress={{ current: step, total: STEPS }}
                back={ROUTES.quizzerIndex as RelativePathString}
                // Only from the second step on.
                onBack={step === 1 ? undefined : () => goTo((step - 1) as Step)}
                enterKey={String(step)}
                enterFrom={flow.travel}
                preview={<TablePreview names={names} />}
                // Grows a clause per answered question, which walking the steps does on its own.
                previewCaption={[
                    t('common.player.seated', { players: seatedNames(names).length }),
                    selected.quiz?.title,
                    triviaMode ? t('pubquizr.oneDevice.triviaMode.caption') : null,
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
                    // The one accent-filled button on the flow, and it only ever appears on the step that can actually use it.
                    <StartGameButton
                        text={starting ? t('common.busy') : t('pubquizr.oneDevice.start')}
                        onPress={() => void start()}
                        disabled={!canStart}
                    />
                )}
            >
                {/* Above the seats rather than below them. */}
                {step === 1 && (
                    <InlineNotification
                        icon="repeat"
                        color={theme.colors.mint}
                        title={t('pubquizr.oneDevice.order.title')}
                        message={t('pubquizr.oneDevice.order.message')}
                    />
                )}

                {step === 1 && (
                    <>
                        <PlayerNamesInput
                            minPlayers={MIN_PLAYERS}
                            maxPlayers={MAX_PLAYERS}
                            names={names}
                            onChange={editNames}
                        />

                        {showProblem && (
                            <AppText style={styles.problem}>{t(problem)}</AppText>
                        )}
                    </>
                )}

                {/* Already a fenced panel of its own, so no card around it. */}
                {step === 2 && (
                    <QuizPicker quiz={selected.quiz} onSelect={selected.select} />
                )}

                {/* What the last step is actually agreeing to, before the button that commits it. */}
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

                {/* Trivia first, because it is the bigger cut of the two. */}
                {step === 3 && (
                    <ToggleRow
                        flush
                        value={triviaMode}
                        onChange={trivia => {
                            setTriviaMode(trivia);
                            if (trivia) setZenMode(false);
                        }}
                        label={t('pubquizr.oneDevice.triviaMode.label')}
                        description={t('pubquizr.oneDevice.triviaMode.description')}
                    />
                )}

                {step === 3 && !triviaMode && (
                    <ToggleRow
                        flush
                        value={zenMode}
                        onChange={setZenMode}
                        label={t('pubquizr.oneDevice.zenMode.label')}
                        description={t('pubquizr.oneDevice.zenMode.description')}
                    />
                )}
            </SettingsPageBase>

            {/* Sits over the form until the running quiz has been dealt with one way or the other. */}
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
                    // `running` cannot be null while the modal is up, but the close animation outlives it.
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

    // The two halves of the recap and the line under them.
    recap: {
        gap: Spacing.three
    },

    hint: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textMuted
    },

    problem: {
        // The section lays its children out with no gap of its own, so the line has to keep itself off the last seat.
        marginTop: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    abandonError: {
        // Inside the modal, where the form's own `InlineNotification` would be a card within a card.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
