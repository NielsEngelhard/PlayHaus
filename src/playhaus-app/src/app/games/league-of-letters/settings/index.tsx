import { abandonGame, createGame, getCurrentGame, type Game } from "@/api/calls/league-of-letters";
import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import LanguageSelect from "@/components/ui/LanguageSelect";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import ToggleRow from "@/components/ui/ToggleRow";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import StartGameButton from "@/features/league-of-letters/components/StartGameButton";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";
import { gameErrorMessage } from "@/features/league-of-letters/game-errors";
import { DEFAULT_SOLO_SETTINGS, SOLO_MAX_GUESSES, SOLO_ROUNDS } from "@/features/league-of-letters/solo-settings";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

/**
 * Set up a solo game, then start it. The settings are local until `Start`, which is
 * what creates the game on the server — so backing out and returning gives you the
 * defaults again, and nothing exists until you commit.
 *
 * Except when there is already a game. A player holds one solo game at a time, and
 * `createGame` throws the old one away — so this screen asks the server first, and a
 * player who left a board running is asked what to do about it before the form behind
 * the question can quietly destroy it.
 */
export default function LeagueOfLettersSettingsPage() {
    const theme = useTheme();
    const styles = useStyles();

    // Claims the viewport: no bottom bar, and the footer can sit on the bottom edge.
    // Called before every early return below, so the hook order never changes.
    useFullScreen();

    const router = useRouter();
    const { status, user } = useAuth();
    const [settings, setSettings] = useState(DEFAULT_SOLO_SETTINGS);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** False until the server has said whether a game is already running. */
    const [checked, setChecked] = useState(false);
    /** The game that was already running, until the player has said what to do with it. */
    const [running, setRunning] = useState<Game | null>(null);
    const [abandoning, setAbandoning] = useState(false);
    /** Kept apart from `error`, which belongs to the form the modal is sitting on top of. */
    const [abandonError, setAbandonError] = useState<string | null>(null);

    // Nothing may touch state after unmount — the redirect below unmounts this
    // screen while the request that caused it may still be settling.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * The account's language is where this form starts, once the session has one.
     *
     * Seeded rather than read straight off the user, and only the once: after that
     * the picker below owns the value, so choosing English here is a choice about
     * this game and changing the account's language in another tab cannot reach in
     * and move a knob the player has already set. Nothing is written back either —
     * the profile screen is where the account's own language is changed.
     */
    const seeded = useRef(false);
    useEffect(() => {
        if (seeded.current || user === null) return;

        seeded.current = true;
        setSettings(current => ({ ...current, locale: user.locale }));
    }, [user]);

    // Only a signed-in session has a game to find; while the session is being
    // restored there is nothing to ask about yet.
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        // Asking on mount and acting on the answer is the whole job. Every state
        // change happens after the `await`, never on the way in, so nothing
        // cascades in the render this effect belongs to — same shape as `useGame`'s
        // load.
        void (async () => {
            let found: Game | null = null;
            try {
                found = await getCurrentGame();
            } catch {
                // The check failing is not worth stopping on: the form below still
                // works, and starting a game from it replaces whatever was there —
                // which is what would have happened before this screen ever asked.
            }

            if (!mounted.current) return;

            // Both outcomes end the wait. A game that was found is put to the player
            // as a question over the form rather than acted on for them: it took a
            // while to build and losing it to a screen they only meant to look at
            // would be the app's decision, not theirs.
            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the board they left. */
    function resume(game: Game) {
        // `replace`, not `push`: this screen would send the player straight back to
        // the board they just left, so it must not be behind it.
        router.replace({
            pathname: ROUTES.leagueOfLettersSolo,
            params: { gameId: game.id }
        });
    }

    /**
     * Throw the running game away and stay here. What is left behind the closing modal
     * is the form, which is now free to make a new game out of nothing.
     */
    async function abandon(game: Game) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await abandonGame(game.id);
            if (!mounted.current) return;

            setRunning(null);
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure. Closing it would leave the player looking at a form
            // that still cannot be used without destroying the game they just failed to
            // destroy, with nothing on screen saying so.
            setAbandonError(gameErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    async function start() {
        if (starting) return;

        setStarting(true);
        setError(null);

        try {
            const game = await createGame(settings);

            // Only the id travels. Everything else about the game — its length, its
            // language, how many rounds it drew — is the server's answer, and the
            // play screen reads it off the game it fetches rather than off what
            // this screen happened to ask for.
            router.push({
                pathname: ROUTES.leagueOfLettersSolo,
                params: { gameId: game.id }
            });
        } catch (failure) {
            setError(gameErrorMessage(failure));
        } finally {
            setStarting(false);
        }
    }

    // Held back until the answer is in. A form that appears on its own and then has a
    // panel drop over it a moment later reads as a misfire, and for the length of that
    // moment it is a form whose only outcome would be destroying a game.
    if (!checked) {
        return <LoadingPage message='Spel zoeken…' />;
    }

    return (
        <View style={styles.container}>
            {/* Broken by hand rather than left to wrap: the design sets the heading on
                two lines, and letting the column decide would move the break as the
                viewport changes. */}
            <SimpleTextHero
                title={'Zet je spel\nklaar'}
                description='Er wordt niets aangemaakt tot je op start drukt.'
            />

            <View style={styles.wordLength}>
                <WordLengthCard
                    value={settings.wordLength}
                    onChange={wordLength => setSettings(current => ({ ...current, wordLength }))}
                />           
            </View>

            <View style={styles.language}>
                <LanguageSelect
                    value={settings.locale}
                    onChange={locale => setSettings(current => ({ ...current, locale }))}
                />
            </View>

            <ToggleRow
                value={settings.hardMode}
                onChange={value => setSettings(current => ({ ...current, hardMode: value }))}
                label="Hard mode"
                description="Pick random word that can be ANY existing word in the language. When disabled an easier set of words will be used."
                icon="zap"
            />

            {error && (
                <View style={styles.error}>
                    <InlineNotification
                        icon='alert-triangle'
                        color={theme.colors.blush}
                        title='Mislukt'
                        message={error}
                    />
                </View>
            )}

            {/* `marginTop: auto` is what pins this to the bottom edge, which only works
                because `useFullScreen` gives the column a height to push against. */}
            <View style={styles.footer}>
                <View style={styles.facts}>
                    <Feather name='info' size={14} color={theme.colors.textMuted} />

                    <AppText style={styles.factsText}>
                        {SOLO_ROUNDS} rondes · {SOLO_MAX_GUESSES} pogingen per ronde · eerste letter gegeven
                    </AppText>
                </View>

                <StartGameButton
                    text={starting ? 'Bezig…' : 'Start met spelen'}
                    onPress={start}
                    disabled={starting}
                />
            </View>

            {/*
              * Sits over the form until the running game has been dealt with one way or
              * the other. No dismissal: both ways out are on it, and a third that just
              * put the player back on a form they cannot safely use would not be one.
              */}
            <PopupModal
                visible={running !== null}
                title='Je speelt al een spel'
                message='Er staat nog een solospel open. Ga verder waar je gebleven was, of gooi het weg en stel een nieuw spel in.'
            >
                {abandonError && (
                    <AppText style={styles.abandonError}>{abandonError}</AppText>
                )}

                <TextButton
                    text='Verder spelen'
                    variant='primary'
                    fullWidth
                    disabled={abandoning}
                    // `running` cannot be null while the modal is up, but the close
                    // animation outlives it — so the buttons have to survive it too.
                    onPress={() => running && resume(running)}
                />

                <TextButton
                    text={abandoning ? 'Bezig…' : 'Weggooien'}
                    variant='muted'
                    fullWidth
                    disabled={abandoning}
                    onPress={() => running && void abandon(running)}
                />
            </PopupModal>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flex: 1,
        width: '100%'
    },
    wordLength: {
        marginTop: 20
    },
    language: {
        marginTop: 14
    },
    error: {
        marginTop: 14
    },
    footer: {
        marginTop: 'auto',
        // Only a floor, for the case where the cards above already fill the screen and
        // `marginTop: auto` has no slack left to give. The gap under the button is the
        // layout's `fullScreenBody` padding — one owner for the bottom edge, so every
        // full-screen page ends the same distance off it.
        paddingTop: Spacing.four
    },
    facts: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        marginBottom: Spacing.three - 4
    },
    factsText: {
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    abandonError: {
        // Inside the modal, where the form's own `InlineNotification` would be a card
        // within a card. The panel is already the thing being looked at, so the line
        // only has to be readable and the wrong colour for good news.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
