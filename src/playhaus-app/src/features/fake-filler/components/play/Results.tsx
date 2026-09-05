import type { FFGamePlayer } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import BackButton from "@/components/ui/BackButton";
import Card from "@/components/ui/Card";
import Confetti from "@/components/ui/Confetti";
import FinalScoreboard from "@/components/ui/FinalScoreboard";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    players: FFGamePlayer[],
    /** Whose screen this is, so one row reads `You` and the paper falls for the right person. */
    userId: string,
    /** Who is still connected, which is who a rematch would actually gather. */
    online: Set<string>,
    /** This player owns the room: the next one is theirs to open. */
    isHost: boolean,
    /** Host only. Opens the next room; everybody still here is carried to it. */
    onPlayAgain: () => void,
    playingAgain: boolean,
    /** It could not be opened. Said under the button, which stays pressable. */
    error: TranslationKey | null
}

/**
 * How the game ends: the table, ranked, and the one thing left to decide.
 *
 * Part of the room rather than a page of its own, and that is load-bearing. The room's
 * socket is what carries everybody into the next lobby, and a result that navigated away
 * would hang up on the only connection that can deliver the new code — every guest would
 * have to be given it by hand. So the room shows another screen instead of sending
 * anybody anywhere.
 *
 * Which is also why the guests get a sentence rather than a button: their part is to stay
 * put, and the screen has to say so, or sitting still looks like being stuck.
 */
export default function Results({
    players,
    userId,
    online,
    isHost,
    onPlayAgain,
    playingAgain,
    error
}: Props) {
    const styles = useStyles();
    const t = useT();

    // Ranked the same way `FinalScoreboard` ranks the list it draws. This is only for the
    // line above it, which needs to name the top of that list.
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const best = ranked[0];
    // A shared top score is nobody's win. Said as a draw rather than handed to whoever the
    // sort happened to put first — and a likelier outcome here than in a game with a
    // clock, since every round pays out in single points.
    const drawn = ranked.length > 1 && ranked[1].score === best?.score;
    const youWon = !drawn && best?.userId === userId;

    const outcome = best === undefined
        ? undefined
        : drawn
            ? t('fakeFiller.results.tie', { score: best.score })
            : youWon
                ? t('fakeFiller.results.youWin', { score: best.score })
                : t('fakeFiller.results.playerWins', { name: best.name, score: best.score });

    return (
        <View style={styles.page}>
            <View style={styles.body}>
                <SimpleTextHero title={t('fakeFiller.results.title')} description={outcome} />

                {/* The live rings matter here in a way they would not on a solo result:
                    the host is about to decide whether to play again with the same
                    people, and this is where they see who is still on the other end. */}
                <FinalScoreboard players={players} userId={userId} online={online} />

                {isHost ? (
                    <View style={styles.again}>
                        <ActionButton
                            text={playingAgain
                                ? t('fakeFiller.lobby.opening')
                                : t('fakeFiller.results.againSamePlayers')}
                            size='large'
                            icon='refresh-cw'
                            disabled={playingAgain}
                            onPress={onPlayAgain}
                        />

                        {/* Under the button rather than in its place: the room is still
                            there and pressing again is a perfectly good next move. */}
                        {error !== null && (
                            <AppText style={styles.error}>{t(error)}</AppText>
                        )}

                        <AppText style={styles.hint}>{t('fakeFiller.results.autoJoin')}</AppText>
                    </View>
                ) : (
                    <Card style={styles.waiting}>
                        <AppText style={styles.waitingTitle}>
                            {t('fakeFiller.results.anotherRound')}
                        </AppText>

                        <AppText style={styles.waitingText}>
                            {t('fakeFiller.results.hostCanOpen')}
                        </AppText>
                    </Card>
                )}

                {/* The only way out that does not wait for the host. */}
                <BackButton
                    href={ROUTES.fakeFillerIndex}
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
        width: '100%',
        overflow: 'visible'
    },
    body: {
        marginTop: Spacing.four,
        gap: Spacing.four,
        overflow: 'visible'
    },
    again: {
        gap: Spacing.two
    },
    error: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
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
    back: {
        marginVertical: 0,
        alignSelf: 'stretch'
    }
}))
