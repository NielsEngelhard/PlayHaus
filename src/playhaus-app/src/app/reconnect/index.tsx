import LoadingPage from "@/components/layout/LoadingPage";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import ReconnectableGameCard from "@/features/reconnect/components/ReconnectableGameCard";
import { kindOf } from "@/features/reconnect/game-kinds";
import { useReconnectableGames } from "@/features/reconnect/useReconnectableGames";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

/**
 * The games this player walked away from, and the way back into each.
 *
 * One list for every game type there is — solo today, rooms and whatever comes
 * after them later — because "what am I still in the middle of" is one question
 * however many games can answer it. What each row looks like and where its button
 * goes is `GAME_KINDS`' business, not this page's.
 */
export default function ReconnectPage() {
    const router = useRouter();
    const { games, loading, refreshing, error, refresh } = useReconnectableGames();

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title='Reconnect'
                description='Sprong je eruit? Pak de draad weer op waar je gebleven was.'
            />

            <TextButton
                fullWidth={true}
                text={refreshing ? 'Bezig…' : 'Refresh'}
                onPress={refresh}
                disabled={loading || refreshing}
            />

            {loading ? (
                <LoadingPage message='Spellen zoeken…' />
            ) : error !== null ? (
                <InlineNotification
                    icon='alert-triangle'
                    color={Colors.light.blush}
                    title='Mislukt'
                    message={error}
                />
            ) : games.length === 0 ? (
                <View style={styles.empty}>
                    <InlineNotification
                        icon='coffee'
                        title='Niets gevonden'
                        message='Je hebt geen spellen lopen. Zodra je er een start en wegloopt, staat hij hier op je te wachten.'
                    />

                    <TextButton
                        text='Kies een spel'
                        variant='muted'
                        onPress={() => router.push(ROUTES.home)}
                    />
                </View>
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
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.four
    },
    empty: {
        gap: Spacing.three,
        alignItems: 'flex-start'
    },
    list: {
        gap: Spacing.three
    }
})
