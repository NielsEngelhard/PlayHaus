import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import BigIntroText from "@/components/text/BigIntroText";
import InlineNotification from "@/components/ui/InlineNotification";
import NoGamesCard from "@/features/reconnect/components/NoGamesCard";
import ReconnectableGameCard from "@/features/reconnect/components/ReconnectableGameCard";
import RefreshBar from "@/features/reconnect/components/RefreshBar";
import { kindOf, startedAgo } from "@/features/reconnect/game-kinds";
import { useReconnectableGames } from "@/features/reconnect/useReconnectableGames";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useCooldown } from "@/hooks/useCooldown";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/**
 * How long the refresh stays down after a press.
 *
 * The list only changes when this player starts or finishes a game somewhere else,
 * which is not something that happens twice in a breath — this is here to stop the
 * button being leaned on, not to pace anything.
 */
const REFRESH_COOLDOWN_MS = 5000;

/**
 * The games this player walked away from, and the way back into each.
 *
 * One list for every game type there is — solo today, rooms and whatever comes
 * after them later — because "what am I still in the middle of" is one question
 * however many games can answer it. What each row looks like and where its button
 * goes is `GAME_KINDS`' business, not this page's.
 */
export default function ReconnectPage() {
    const theme = useTheme();
    const styles = useStyles();

    const { games, loading, refreshing, error, loadedAt, refresh } = useReconnectableGames();
    const [coolingDown, startCooldown] = useCooldown(REFRESH_COOLDOWN_MS);

    // The heading answers the page rather than naming it, which it can only do once
    // there is an answer. Until then — the first load, or a load that failed — it asks
    // the question instead, rather than claiming nothing is running and taking it back
    // a moment later.
    const settled = !loading && error === null;
    const waiting = games.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                <BigIntroText
                    title={!settled ? 'Waar was je' : waiting ? 'Opnieuw' : 'Er loopt'}
                    accent={!settled ? 'gebleven?' : waiting ? 'Verbinden' : 'niets.'}
                />

                <AppText style={styles.description}>
                    {!settled
                        ? 'We kijken even welke spellen er nog voor je openstaan.'
                        : waiting
                            ? 'Je hebt spellen openstaan. Pak er een op waar je gebleven was.'
                            : 'Start een spel en loop weg — hij staat hier nog als je terugkomt.'}
                </AppText>

                {loadedAt !== null && (
                    <View style={styles.updated}>
                        <Feather name='refresh-cw' size={12} color={theme.colors.textMuted} />

                        <AppText style={styles.updatedText}>
                            Bijgewerkt {startedAgo(loadedAt)}
                        </AppText>
                    </View>
                )}
            </View>

            {loading ? (
                <LoadingPage message='Spellen zoeken…' />
            ) : error !== null ? (
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title='Mislukt'
                    message={error}
                />
            ) : games.length === 0 ? (
                <NoGamesCard />
            ) : (
                // A plain map rather than a list component: the whole page already
                // sits in the layout's ScrollView, and nesting a virtualised list in
                // one scrolls neither properly. Nobody has hundreds of these.
                <View style={styles.list}>
                    {games.map(game => {
                        // Never undefined — the hook drops the types with no screen
                        // to send anyone to — but the row needs it as a value.
                        const kind = kindOf(game);
                        if (kind === undefined) return null;

                        return <ReconnectableGameCard key={game.id} game={game} kind={kind} />;
                    })}
                </View>
            )}

            {/* Under whatever the page turned out to be, because it is about the page
                rather than about any one row on it. */}
            <RefreshBar
                onPress={() => {
                    refresh();
                    startCooldown();
                }}
                busy={refreshing}
                disabled={loading || refreshing || coolingDown}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: 20
    },
    hero: {
        marginTop: 8
    },
    description: {
        marginTop: 10,
        maxWidth: 290,
        fontSize: 14,
        lineHeight: 14 * 1.5,
        color: theme.colors.textSecondary
    },
    updated: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },
    updatedText: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    list: {
        gap: 12
    }
}))
