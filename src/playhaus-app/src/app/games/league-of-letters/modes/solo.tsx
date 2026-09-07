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

/**
 * The four ways to play on your own — pick one, and only then set anything up.
 *
 * This sits between the game's index and the setup form, which is the page that used to
 * be what "Solo" meant. Three of the four are not that form: the daily word and the
 * competitive ladder have no backend yet and log rather than navigate, and quick play
 * skips the form entirely by making the choices for you.
 *
 * The stats on the band are mocked — see `mock-solo-stats.ts`.
 */
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

/**
 * Straight into a game, with the settings decided for you.
 *
 * The whole point is that it is one press, so the length is drawn once when the page
 * arrives rather than when the link is pressed — that way the number on the link is the
 * number you get, and pressing it cannot feel like a slot machine.
 *
 * `createGame` throws away whatever solo game you already have, which is why the setup
 * form asks about one before it shows you a form. Skipping the form must not mean
 * skipping that question, so the same two ways out are offered here — the difference is
 * only that this asks on the press rather than on mount, since there is a whole page of
 * other things to do here and none of them are dangerous.
 */
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

    // Nothing may touch state after unmount — every path out of here navigates away while
    // the request that caused it may still be settling.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /** Make the game and go, with no further questions. */
    async function create() {
        // Only the length is this screen's. The language is the account's, exactly as the
        // setup form seeds it, and hard mode is off — a game nobody set up should be the
        // ordinary one.
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
            // A game that is found is put to the player as a question rather than acted
            // on for them: it took a while to build, and losing it to a link they pressed
            // for a *new* game would be the app's decision, not theirs.
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
        // `replace`, not `push`: this page would send the player straight back to the
        // board they just left, so it must not be behind it.
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

            // Kept open on failure. Closing it would leave the player back on a page whose
            // link still cannot be used without destroying the game that just failed to be
            // destroyed, with nothing on screen saying so.
            setAbandonError(gameErrorMessage(failure));
        } finally {
            if (mounted.current) setAbandoning(false);
        }
    }

    return (
        <>
            {/* A link rather than a third card: the two cards above are the choice, and
                this is the way past making one. */}
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

            {/*
              * The same question the setup form asks, in the same words. No dismissal:
              * both ways out are on it, and a third that just put the player back on a
              * link they cannot safely press would not be one.
              */}
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
                    // `running` cannot be null while the modal is up, but the close
                    // animation outlives it — so the buttons have to survive it too.
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
        // Inside the modal, where the page's own `InlineNotification` would be a card
        // within a card. The panel is already the thing being looked at, so the line only
        // has to be readable and the wrong colour for good news.
        marginBottom: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.destructive
    }
}))
