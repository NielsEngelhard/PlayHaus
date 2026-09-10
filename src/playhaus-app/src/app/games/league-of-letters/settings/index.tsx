import { abandonGame, createGame, getCurrentGame, type Game } from "@/api/calls/league-of-letters";
import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import SettingsPageBase from "@/components/layout/SettingsPageBase";
import AppText from "@/components/text/AppText";
import BigToggleButton, { type BigToggleOption } from "@/components/ui/BigToggleButton";
import LanguageSelect from "@/components/ui/LanguageSelect";
import PopupModal from "@/components/ui/PopupModal";
import StartGameButton from "@/components/ui/StartGameButton";
import TextButton from "@/components/ui/TextButton";
import ToggleRow from "@/components/ui/ToggleRow";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import BoardPreview from "@/features/league-of-letters/components/BoardPreview";
import WordLengthInput from "@/features/league-of-letters/components/WordLengthInput";
import { gameErrorMessage } from "@/features/league-of-letters/game-errors";
import { BONUS_WINDOW_MINUTES, DEFAULT_LOL_SETTINGS, SOLO_MAX_GUESSES, SOLO_MODES, SOLO_ROUNDS, type SoloMode } from "@/features/league-of-letters/solo-settings";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter, type RelativePathString } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

const MODE_ICONS: Record<SoloMode, BigToggleOption<SoloMode>['icon']> = {
    zen: 'smile',
    competitive: 'award'
};

// Set up a solo game, then start it.
export default function LeagueOfLettersSettingsPage() {
    const styles = useStyles();
    const t = useT();

    // `SettingsPageBase` claims this too, but only once it is on screen.
    useChromeless();

    const router = useRouter();
    const { status, user } = useAuth();
    const [settings, setSettings] = useState(DEFAULT_LOL_SETTINGS);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    /** False until the server has said whether a game is already running. */
    const [checked, setChecked] = useState(false);
    /** The game that was already running, until the player has said what to do with it. */
    const [running, setRunning] = useState<Game | null>(null);
    const [abandoning, setAbandoning] = useState(false);
    /** Kept apart from `error`, which belongs to the form the modal is sitting on top of. */
    const [abandonError, setAbandonError] = useState<TranslationKey | null>(null);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // The account's language is where this form starts, once the session has one.
    const seeded = useRef(false);
    useEffect(() => {
        if (seeded.current || user === null) return;

        seeded.current = true;
        setSettings(current => ({ ...current, locale: user.locale }));
    }, [user]);

    // Only a signed-in session has a game to find; while the session is being restored there is nothing to ask about yet.
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        // Asking on mount and acting on the answer is the whole job.
        void (async () => {
            let found: Game | null = null;
            try {
                found = await getCurrentGame();
            } catch {
                // The check failing is not worth stopping on.
            }

            if (!mounted.current) return;

            // Both outcomes end the wait.
            setRunning(found);
            setChecked(true);
        })();
    }, [signedIn]);

    /** Back to the board they left. */
    function resume(game: Game) {
        // `replace`, not `push`: this screen would send the player straight back to the board they just left.
        router.replace({
            pathname: ROUTES.leagueOfLettersSolo,
            params: { gameId: game.id }
        });
    }

    // Throw the running game away and stay here.
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

            // Kept open on failure.
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

            // Only the id travels.
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

    const competitive = settings.mode === 'competitive';

    const modes: BigToggleOption<SoloMode>[] = SOLO_MODES.map(mode => ({
        icon: MODE_ICONS[mode],
        label: t(`lol.settings.mode.${mode}.label`),
        value: mode
    }));

    // Held back until the answer is in.
    if (!checked) {
        return <LoadingPage message={t('lol.settings.loading')} />;
    }

    return (
        <View style={styles.container}>
            <SettingsPageBase
                game={LEAGUE_OF_LETTERS}
                title={t('lol.settings.title')}
                back={ROUTES.leagueOfLettersIndex as RelativePathString}
                preview={<BoardPreview wordLength={settings.wordLength} />}
                previewCaption={[
                    t('lol.settings.wordLengthOption', { letters: settings.wordLength }),
                    t(`lol.settings.summary.${settings.mode}`),
                    settings.hardMode
                        ? t('lol.settings.summary.hardOn')
                        : t('lol.settings.summary.hardOff')
                ].join(' · ')}
                facts={competitive
                    ? t('lol.settings.competitiveFacts', { rounds: SOLO_ROUNDS, guesses: SOLO_MAX_GUESSES, minutes: BONUS_WINDOW_MINUTES })
                    : t('lol.settings.facts', { rounds: SOLO_ROUNDS, guesses: SOLO_MAX_GUESSES })}
                error={error === null ? undefined : t(error)}
                action={
                    <StartGameButton
                        text={starting ? t('common.busy') : t('lol.settings.start')}
                        onPress={start}
                        disabled={starting}
                    />
                }
            >
                {/* One child per ruled section — bare on the sheet, no cards. */}
                <WordLengthInput
                    variant='inline'
                    showValue
                    value={settings.wordLength}
                    onChange={wordLength => setSettings(current => ({ ...current, wordLength }))}
                />

                <LanguageSelect
                    variant='row'
                    value={settings.locale}
                    onChange={locale => setSettings(current => ({ ...current, locale }))}
                />

                <ToggleRow
                    flush
                    value={settings.hardMode}
                    onChange={value => setSettings(current => ({ ...current, hardMode: value }))}
                    label={t('lol.settings.hardMode.label')}
                    description={t('lol.settings.hardMode.description')}
                />

                <BigToggleButton
                    badge={t('lol.settings.mode.badge')}
                    description={t(`lol.settings.mode.${settings.mode}.description`)}
                    onChange={mode => setSettings(current => ({ ...current, mode }))}
                    options={modes}
                    title={t('lol.settings.mode.title')}
                    value={settings.mode}
                />
            </SettingsPageBase>

            {/* Sits over the form until the running game has been dealt with one way or the other. */}
            <PopupModal
                visible={running !== null}
                title={t('lol.settings.running.title')}
                message={t('lol.settings.running.message')}
            >
                {abandonError && (
                    <AppText style={styles.abandonError}>{t(abandonError)}</AppText>
                )}

                <TextButton
                    text={t('lol.settings.running.resume')}
                    variant='primary'
                    fullWidth
                    disabled={abandoning}
                    // `running` cannot be null while the modal is up, but the close animation outlives it.
                    onPress={() => running && resume(running)}
                />

                <TextButton
                    text={abandoning ? t('common.busy') : t('lol.settings.running.discard')}
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
    // Only here to pass the window's height through to the base, which is the page.
    container: {
        flex: 1,
        width: '100%'
    },
    abandonError: {
        // Inside the modal, where the form's own `InlineNotification` would be a card within a card.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
