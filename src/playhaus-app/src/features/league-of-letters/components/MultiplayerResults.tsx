import type { Game } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import BackButton from "@/components/ui/BackButton";
import Card from "@/components/ui/Card";
import Confetti from "@/components/ui/Confetti";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import FinalScoreboard from "@/features/league-of-letters/components/FinalScoreboard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { View } from "react-native";

interface Props {
    /** The finished game. Only its scoreboard and its shape are read. */
    game: Game,
    /** Whose screen this is, so one row reads `Jij` and the paper falls for the right person. */
    userId: string,
    /** Who is still connected, which is who a rematch would actually gather. */
    online: Set<string>,
    /** This player owns the room: the next one is theirs to open. */
    isHost: boolean,
    /** Host only. Opens the next room; everybody still here is carried to it. */
    onPlayAgain: () => void,
    /** The next room is being opened. */
    playingAgain: boolean,
    /** It could not be opened. Said under the button, which stays pressable. */
    error: TranslationKey | null
}

/**
 * How a shared game ends: the table, ranked, and the one thing left to decide.
 *
 * Deliberately part of the room rather than a page of its own, which is the difference
 * between this and the solo uitslag. The room's socket is what carries everybody into the
 * next lobby, and a result that navigated away from the room would hang up on the only
 * connection that can deliver that — every guest would have to be given the new code by
 * hand. So the room shows a third screen instead of sending anybody anywhere.
 *
 * Which is also why the guests get a sentence rather than a button: their part is to stay
 * put, and the screen has to say so, or sitting still looks like being stuck.
 */
export default function MultiplayerResults({
    game,
    userId,
    online,
    isHost,
    onPlayAgain,
    playingAgain,
    error
}: Props) {
    const styles = useStyles();
    const t = useT();

    const players = game.players ?? [];

    // Ranked the same way `FinalScoreboard` ranks the list it draws. This is only for
    // the line above it, which needs to name the top of that list.
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const best = ranked[0];
    // A shared top score is nobody's win. Said as a draw rather than handed to whoever
    // the sort happened to put first.
    const drawn = ranked.length > 1 && ranked[1].score === best?.score;
    const youWon = !drawn && best?.userId === userId;

    const outcome = best === undefined
        ? undefined
        : drawn
            ? t('lol.lobby.results.tie', { score: best.score })
            : youWon
                ? t('lol.lobby.results.youWin', { score: best.score })
                : t('lol.lobby.results.playerWins', { name: best.name, score: best.score });

    return (
        <View style={styles.page}>
            <View style={styles.body}>
                <SimpleTextHero title={t('lol.lobby.results.title')} description={outcome} />

                {/* The live rings matter here in a way they do not on a solo result: the
                    host is about to decide whether to play again with the same people,
                    and this is where they can see who is still on the other end. */}
                <FinalScoreboard players={players} userId={userId} online={online} />

                {isHost ? (
                    <View style={styles.again}>
                        <ActionButton
                            text={playingAgain ? t('lol.lobby.opening') : t('lol.lobby.results.againSamePlayers')}
                            size='large'
                            icon='refresh-cw'
                            disabled={playingAgain}
                            onPress={onPlayAgain}
                        />

                        {/* Under the button rather than in its place: the lobby is still
                            there and pressing again is a perfectly good next move. */}
                        {error !== null && (
                            <AppText style={styles.error}>{t(error)}</AppText>
                        )}

                        <AppText style={styles.hint}>
                            {t('lol.lobby.results.autoJoin')}
                        </AppText>
                    </View>
                ) : (
                    <Card style={styles.waiting}>
                        <AppText style={styles.waitingTitle}>{t('lol.lobby.results.anotherRound')}</AppText>

                        <AppText style={styles.waitingText}>
                            {t('lol.lobby.results.hostCanOpen')}
                        </AppText>
                    </Card>
                )}

                {/* The only way out that does not wait for the host. */}
                <BackButton
                    href={ROUTES.leagueOfLettersIndex}
                    label={t('common.backToGames')}
                    variant='neutral'
                    style={styles.back}
                />
            </View>

            {/* Last, so it falls in front of everything. It takes no room and no touches,
                so the buttons underneath keep working while it comes down. */}
            <Confetti active={youWon} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        width: '100%'
    },
    body: {
        marginTop: Spacing.four,
        gap: Spacing.four
    },
    again: {
        gap: Spacing.two
    },
    error: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        // The text red rather than the fill red: `#E31029` vibrates on the dark canvas,
        // and this is a line to read rather than an alarm.
        color: theme.colors.destructiveText
    },
    hint: {
        fontSize: FontSizes.sm,
        color: theme.colors.textSecondary
    },
    waiting: {
        gap: Spacing.two
    },
    waitingTitle: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        color: theme.colors.text
    },
    waitingText: {
        fontSize: FontSizes.sm,
        lineHeight: 21,
        color: theme.colors.textSecondary
    },
    // Trimmed back from the margin the button carries by default: the gap on `body` is
    // already holding it off whatever is above it.
    back: {
        marginVertical: 0,
        alignSelf: 'stretch'
    }
}))
