import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import PlayerSeats from "@/features/pubquizr/components/PlayerSeats";
import QuizPicker from "@/features/pubquizr/components/QuizPicker";
import { MIN_PLAYERS, seatedNames, tableProblem } from "@/features/pubquizr/one-device-table";
import { quizErrorMessage } from "@/features/pubquizr/pubquizr-errors";
import { startSingleDeviceQuizRequest } from "@/features/pubquizr/pubquizr-sessions";
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
 * exists until you commit. Same shape as the League of Letters settings screen, minus
 * its question about a game already running: a pubquizr session is not exclusive, so
 * there is nothing here that could quietly destroy one.
 *
 * Two things are being asked for, and only one of them is obvious. The quiz is a choice
 * off a shelf. The players are a *seating order*: the phone is passed round the table as
 * the quiz master role moves, so the order the names go in is the order the phone
 * travels, which is why the note above the seats says so out loud.
 *
 * No `useFullScreen` here, unlike the LoL settings screen. That one is a short form that
 * wants its footer on the bottom edge; this one has an entire paginated shelf in the
 * middle of it and belongs in the app's own scroller.
 */
export default function OneDeviceQuizerSetup() {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const router = useRouter();

    // Handed over by `QuizRow` on the index: tapping a quiz there is the same journey as
    // pressing "one device", with the choice already made.
    const { quizId } = useLocalSearchParams<{ quizId?: string }>();
    const selected = useSelectedQuiz(quizId);

    const [names, setNames] = useState<string[]>(EMPTY_TABLE);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);

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
            const session = await startSingleDeviceQuizRequest(selected.quiz.id, seats);

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

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title={t('pubquizr.oneDevice.title')}
                description={t('pubquizr.oneDevice.description')}
            />

            <View style={styles.section}>
                <Label label={t('pubquizr.oneDevice.players.label')} />

                {/* Above the seats rather than below them: it is the instruction for
                    filling them in, and an instruction read afterwards is a correction. */}
                <InlineNotification
                    icon="repeat"
                    color={theme.colors.mint}
                    title={t('pubquizr.oneDevice.order.title')}
                    message={t('pubquizr.oneDevice.order.message')}
                />

                <PlayerSeats names={names} onChange={editNames} disabled={starting} />

                {showProblem && (
                    <AppText style={styles.problem}>{t(problem)}</AppText>
                )}
            </View>

            <View style={styles.section}>
                <QuizPicker quiz={selected.quiz} onSelect={selected.select} />
            </View>

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(error)}
                />
            )}

            <ActionButton
                size="large"
                icon="play"
                text={starting ? t('common.busy') : t('pubquizr.oneDevice.start')}
                onPress={() => void start()}
                disabled={!canStart}
            />
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
    container: {
        width: '100%',
        gap: Spacing.four
    },

    section: {
        width: '100%',
        gap: Spacing.three
    },

    problem: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 700,
        color: theme.colors.textMuted
    }
}))
