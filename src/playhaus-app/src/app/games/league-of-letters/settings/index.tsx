import { createGame, getCurrentGame, type Game } from "@/api/calls/league-of-letters";
import LoadingPage from "@/components/layout/LoadingPage";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import SelectInput from "@/components/ui/SelectInput";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";
import { gameErrorMessage } from "@/features/league-of-letters/game-errors";
import { DEFAULT_SOLO_SETTINGS, LANGUAGES } from "@/features/league-of-letters/solo-settings";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

// Built once: the list never changes, and a fresh array every render would be a new
// prop every render.
const LANGUAGE_OPTIONS = LANGUAGES.map(({ code, label, description }) => ({
    value: code,
    label,
    description
}));

/**
 * Set up a solo game, then start it. The settings are local until `Start`, which is
 * what creates the game on the server — so backing out and returning gives you the
 * defaults again, and nothing exists until you commit.
 *
 * Except when there is already a game. A player holds one solo game at a time, and
 * `createGame` throws the old one away — so this screen asks the server first, and
 * a player who left a board running is put back on it rather than being shown a form
 * whose only outcome would be deleting it.
 */
export default function LeagueOfLettersSettingsPage() {
    const router = useRouter();
    const { status } = useAuth();
    const [settings, setSettings] = useState(DEFAULT_SOLO_SETTINGS);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** False until the server has said whether a game is already running. */
    const [checked, setChecked] = useState(false);

    // Nothing may touch state after unmount — the redirect below unmounts this
    // screen while the request that caused it may still be settling.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

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
            let running: Game | null = null;
            try {
                running = await getCurrentGame();
            } catch {
                // The check failing is not worth stopping on: the form below still
                // works, and starting a game from it replaces whatever was there —
                // which is what would have happened before this screen ever asked.
            }

            if (!mounted.current) return;

            if (running !== null) {
                // `replace`, not `push`: this screen would send the player straight
                // back to the board they just left, so it must not be behind it.
                router.replace({
                    pathname: ROUTES.leagueOfLettersSolo,
                    params: { gameId: running.id }
                });
                return;
            }

            setChecked(true);
        })();
    }, [signedIn, router]);

    // Held back rather than shown and then yanked away: a form that appears for a
    // frame and redirects reads as a misfire, and the settings on it were never
    // going to be used.
    if (!checked) {
        return <LoadingPage message='Spel zoeken…' />;
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

    return (
        <View style={styles.container}>
            <BackButton href={ROUTES.leagueOfLettersIndex} />

            <View style={styles.body}>
                <SimpleTextHero
                    title='Solo instellen'
                    description='Stel je spel samen [SOLO].'
                />

                <View style={tilt('-0.5deg')}>
                    <WordLengthCard
                        value={settings.wordLength}
                        onChange={wordLength => setSettings(current => ({ ...current, wordLength }))}
                    />
                </View>

                <View style={tilt('0.4deg')}>
                    <SelectInput
                        label='Taal'
                        value={settings.locale}
                        options={LANGUAGE_OPTIONS}
                        onChange={locale => setSettings(current => ({ ...current, locale }))}
                    />
                </View>

                {error && (
                    <InlineNotification
                        icon='alert-triangle'
                        color={Colors.light.blush}
                        title='Mislukt'
                        message={error}
                    />
                )}

                <TextButton
                    text={starting ? 'Bezig…' : 'Start'}
                    onPress={start}
                    disabled={starting}
                    fullWidth
                    style={styles.startButton}
                />
            </View>
        </View>
    )
}

const START_BUTTON_HEIGHT = 60;

const styles = StyleSheet.create({
    container: {
        width: '100%'
    },
    body: {
        marginTop: Spacing.three,
        gap: Spacing.four
    },
    startButton: {
        // A little air above it, so it reads as the end of the page rather than as
        // one more card in the stack.
        marginTop: Spacing.two,
        height: START_BUTTON_HEIGHT,
        // This is the one thing the page is for, so it wears the primary fill rather
        // than `TextButton`'s default. Worth a proper variant prop on the button if a
        // second screen ever needs the same thing.
        backgroundColor: Colors.light.primary
    }
})
