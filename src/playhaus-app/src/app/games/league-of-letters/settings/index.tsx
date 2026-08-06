import BackBar from "@/components/layout/BackBar";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import LanguageCard from "@/features/league-of-letters/components/LanguageCard";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";
import { createSoloGame } from "@/features/league-of-letters/mock-solo-game";
import { DEFAULT_SOLO_SETTINGS } from "@/features/league-of-letters/solo-settings";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

/**
 * Set up a solo game, then start it. Nothing is saved: the settings live here until
 * `Start` hands them to the game screen, so backing out and returning gives you the
 * defaults again.
 */
export default function LeagueOfLettersSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState(DEFAULT_SOLO_SETTINGS);
    const [starting, setStarting] = useState(false);
    const [failed, setFailed] = useState(false);

    async function start() {
        if (starting) return;

        setStarting(true);
        setFailed(false);

        try {
            const { gameId } = await createSoloGame(settings);

            router.push({
                pathname: ROUTES.leagueOfLettersSolo,
                params: { gameId, lang: settings.language, length: settings.wordLength }
            });
        } catch {
            setFailed(true);
        } finally {
            setStarting(false);
        }
    }

    return (
        <View style={styles.container}>
            <BackBar href={ROUTES.leagueOfLettersIndex} tag='Solo' />

            <View style={styles.body}>
                <SimpleTextHero
                    title='Solo instellen'
                    description='Kies je woordlengte en taal. Daarna gaan we los.'
                />

                <View style={tilt('-0.5deg')}>
                    <WordLengthCard
                        value={settings.wordLength}
                        onChange={wordLength => setSettings(current => ({ ...current, wordLength }))}
                    />
                </View>

                <View style={tilt('0.4deg')}>
                    <LanguageCard
                        value={settings.language}
                        onChange={language => setSettings(current => ({ ...current, language }))}
                    />
                </View>

                {failed && (
                    <InlineNotification
                        icon='alert-triangle'
                        color={Colors.light.blush}
                        title='Mislukt'
                        message='Het spel kon niet gestart worden. Probeer het nog een keer.'
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
