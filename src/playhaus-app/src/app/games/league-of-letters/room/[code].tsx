import { useFullScreen } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { useMultiplayerGame } from "@/features/league-of-letters/useMultiplayerGame";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

/**
 * A room, joined by its code.
 *
 * Two screens in one, and which one you get is the room's own business: while the lobby
 * is waiting this is the lobby, and the moment the host starts — which a guest finds out
 * about through the socket — it becomes the board. The host arrives here already on the
 * second half, having started the game on the way over.
 */
export default function LeagueOfLettersRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const state = useLobby(code);

    // `useFullScreen` lives in `RoomGame` rather than here: a board has to fit the window
    // exactly, and a lobby is a column of cards that wants the ordinary scrolling page
    // and the bottom bar. A hook cannot be called for one and not the other, so the
    // board is its own component.
    if (state.lobby?.status === 'started' && state.lobby.gameId !== undefined) {
        return <RoomGame code={code} gameId={state.lobby.gameId} />;
    }

    return (
        <LobbyView
            state={state}
            // Nothing to do: this screen is already the room the game started in, and the
            // status it started with is what swaps the board in above.
            onStarted={() => { }}
        />
    )
}

interface RoomGameProps {
    code: string,
    gameId: string
}

/** The multiplayer board: the same one solo plays on, plus a clock and a scoreboard. */
function RoomGame({ code, gameId }: RoomGameProps) {
    useFullScreen();

    const { user } = useAuth();

    const {
        game,
        round,
        online,
        loading,
        error,
        myTurn,
        typing,
        guess,
        onTyping,
        nextRound,
        gameOver,
        reload
    } = useMultiplayerGame(gameId, code);

    if (error !== null) {
        return (
            <View style={styles.page}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={Colors.light.blush}
                    title='Geen spel'
                    message={error}
                >
                    <TextButton text='Opnieuw' onPress={reload} />
                </InlineNotification>
            </View>
        )
    }

    if (loading || game === null || round === null) {
        return <LoadingPage message='Spel laden…' />;
    }

    return (
        <View style={styles.page}>
            <PlayingGame
                game={game}
                round={round}
                userId={user?.id ?? ''}
                online={online}
                onGuess={guess}
                myTurn={myTurn}
                typing={typing}
                onTyping={onTyping}
                // Only while there is somewhere to go on to. The last round's verdict is
                // the end of the game, and the board says so itself.
                onNextRound={gameOver ? undefined : nextRound}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        width: '100%',
        gap: Spacing.two
    }
})
