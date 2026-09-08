import { abandonGame, createGame, getCurrentGame, type Game } from "@/api/calls/league-of-letters";
import GameModePageBase, { type ModeFact } from "@/components/layout/GameModePageBase";
import AppText from "@/components/text/AppText";
import ModeOptionCard from "@/components/ui/ModeOptionCard";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import WordOfTheDayCard from "@/features/league-of-letters/components/WordOfTheDayCard";
import { gameErrorMessage } from "@/features/league-of-letters/game-errors";
import { MOCK_SOLO_STATS } from "@/features/league-of-letters/mock-solo-stats";
import { DEFAULT_LOL_SETTINGS, QUICK_WORD_LENGTHS, type WordLength } from "@/features/league-of-letters/solo-settings";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useRouter, type RelativePathString } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

// The four ways to play on your own — pick one, and only then set anything up.
export default function LeagueOfLettersSoloModesPage() {
    const styles = useStyles();
    const t = useT();

    const facts: ModeFact[] = [
        { icon: 'zap', text: t('lol.modes.solo.facts.streak', { days: MOCK_SOLO_STATS.streakDays }) },
        { icon: 'clock', text: t('lol.modes.solo.facts.played', { played: MOCK_SOLO_STATS.played }) },
        { icon: 'award', text: t('lol.modes.solo.facts.best', { best: MOCK_SOLO_STATS.best }) }
    ];

    return (
        <GameModePageBase
            game={LEAGUE_OF_LETTERS}
            title={t('lol.modes.solo.title')}
            description={t('lol.modes.solo.description')}
            facts={facts}
            back={ROUTES.leagueOfLettersIndex as RelativePathString}
        >
            <WordOfTheDayCard />

            <View style={styles.pair}>
                <ModeOptionCard
                    icon='smile'
                    tint={Brand.mint}
                    title={t('lol.modes.solo.free.title')}
                    description={t('lol.modes.solo.free.description')}
                    href={ROUTES.leagueOfLettersSoloSettings as RelativePathString}
                />

                <ModeOptionCard
                    icon='award'
                    tint={Brand.blush}
                    title={t('lol.modes.solo.competitive.title')}
                    description={t('lol.modes.solo.competitive.description')}
                    // TODO: no competitive mode exists yet.
                    onPress={() => console.log('todo')}
                />
            </View>

            <QuickPlay />
        </GameModePageBase>
    )
}

// Straight into a game, with the settings decided for you.
function QuickPlay() {
    const styles = useStyles();
    const t = useT();

    const router = useRouter();
    const { user } = useAuth();

    const [length] = useState<WordLength>(
        () => QUICK_WORD_LENGTHS[Math.floor(Math.random() * QUICK_WORD_LENGTHS.length)]
    );

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    /** The game that was already running, until the player has said what to do with it. */
    const [running, setRunning] = useState<Game | null>(null);
    const [abandoning, setAbandoning] = useState(false);
    /** Kept apart from `error`, which belongs to the page the modal is sitting on top of. */
    const [abandonError, setAbandonError] = useState<TranslationKey | null>(null);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /** Make the game and go, with no further questions. */
    async function create() {
        // Only the length is this screen's.
        const game = await createGame({
            ...DEFAULT_LOL_SETTINGS,
            locale: user?.locale ?? DEFAULT_LOL_SETTINGS.locale,
            wordLength: length
        });

        if (!mounted.current) return;

        // Only the id travels; the board reads the rest off the game it fetches.
        router.push({
            pathname: ROUTES.leagueOfLettersSolo,
            params: { gameId: game.id }
        });
    }

    async function start() {
        if (busy) return;

        setBusy(true);
        setError(null);

        try {
            // A game that is found is put to the player as a question rather than acted on for them.
            const found = await getCurrentGame();
            if (!mounted.current) return;

            if (found !== null) {
                setRunning(found);
                return;
            }

            await create();
        } catch (failure) {
            if (mounted.current) setError(gameErrorMessage(failure));
        } finally {
            if (mounted.current) setBusy(false);
        }
    }

    /** Back to the board they left. */
    function resume(game: Game) {
        // `replace`, not `push`: this page would send the player straight back to the board they just left.
        router.replace({
            pathname: ROUTES.leagueOfLettersSolo,
            params: { gameId: game.id }
        });
    }

    /** Throw the running game away, and make the quick one in its place. */
    async function abandon(game: Game) {
        if (abandoning) return;

        setAbandoning(true);
        setAbandonError(null);

        try {
            await abandonGame(game.id);
            if (!mounted.current) return;

            setRunning(null);
            await create();
        } catch (failure) {
            if (!mounted.current) return;

            // Kept open on failure.
            setAbandonError(gameErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    return (
        <>
            {/* A link rather than a third card: the two cards above are the choice, and this is the way past making one. */}
            <Pressable
                onPress={() => void start()}
                disabled={busy}
                accessibilityRole='button'
                style={styles.quick}
            >
                <Feather name='zap' size={15} color={LEAGUE_OF_LETTERS.color} />

                <AppText style={styles.quickText}>
                    {busy ? t('common.busy') : t('lol.modes.solo.quick', { letters: length })}
                </AppText>
            </Pressable>

            {error !== null && (
                <AppText style={styles.error}>{t(error)}</AppText>
            )}

            {/* The same question the setup form asks, in the same words. */}
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
        </>
    )
}

const useStyles = createThemedStyles(theme => ({
    pair: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10
    },

    quick: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: Spacing.one
    },
    quickText: {
        fontSize: 13,
        fontWeight: 900,
        textDecorationLine: 'underline',
        color: theme.colors.text
    },

    error: {
        textAlign: 'center',
        fontSize: FontSizes.xs,
        fontWeight: 600,
        color: theme.colors.destructiveText
    },
    abandonError: {
        // Inside the modal, where the page's own `InlineNotification` would be a card within a card.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
