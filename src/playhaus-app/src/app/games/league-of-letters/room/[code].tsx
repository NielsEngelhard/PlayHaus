import { useChromeless } from "@/components/layout/FullScreenContext";
import LoadingPage from "@/components/layout/LoadingPage";
import BackButton from "@/components/ui/BackButton";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LobbyView from "@/features/league-of-letters/components/LobbyView";
import MultiplayerResults from "@/features/league-of-letters/components/MultiplayerResults";
import PlayingGame from "@/features/league-of-letters/components/PlayingGame";
import RoomClosedNotice from "@/components/ui/RoomClosedNotice";
import { useLobby } from "@/features/league-of-letters/useLobby";
import { useMultiplayerGame, type MultiplayerGameState } from "@/features/league-of-letters/useMultiplayerGame";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { RelativePathString, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

// A room, joined by its code.
export default function LeagueOfLettersRoomPage() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();
    const t = useT();

    const state = useLobby(code);

    const gameId = state.lobby?.status === 'started' ? state.lobby.gameId : undefined;
    const table = useMultiplayerGame(gameId, code);

    /** The board has had its last word and the room is showing the result. */
    const [finished, setFinished] = useState(false);
    // Stable: the board hangs the wait after the final verdict off this.
    const finish = useCallback(() => setFinished(true), []);

    // A different game under the same screen, which is exactly what playing again is.
    const [showing, setShowing] = useState(gameId);
    if (showing !== gameId) {
        setShowing(gameId);
        setFinished(false);
    }

    // The host opened the next room, so everybody still here goes to it.
    const { rematchCode } = state;
    useEffect(() => {
        if (rematchCode === null || rematchCode === code) return;

        router.replace(ROUTES.leagueOfLettersRoom(rematchCode) as RelativePathString);
    }, [rematchCode, code, router]);

    // The host stopped the game, or shut the room out from under everybody waiting in it.
    if (state.closed) {
        return (
            <RoomClosedNotice
                message={gameId !== undefined
                    ? t('lol.lobby.hostStoppedGame')
                    : t('lol.lobby.hostClosedLobby')}
                href={ROUTES.leagueOfLettersIndex}
            />
        )
    }

    if (gameId !== undefined) {
        return finished
            ? <RoomResults table={table} isHost={state.isHost} onPlayAgain={() => void state.rematch()} playingAgain={state.rematching} error={state.actionError} />
            : <RoomGame table={table} onFinish={finish} />;
    }

    return (
        <LobbyView
            state={state}
            // Nothing to do: this screen is already the room the game started in.
            onStarted={() => { }}
        />
    )
}

interface RoomGameProps {
    table: MultiplayerGameState,
    /** Moves the room on to the uitslag once the last round has been read. */
    onFinish: () => void
}

/** The multiplayer board: the same one solo plays on, plus a clock and a scoreboard. */
function RoomGame({ table, onFinish }: RoomGameProps) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    // The claim lives here rather than on the page.
    useChromeless();

    const { user } = useAuth();

    const { game, round, online, loading, error, myTurn, guess, onTyping, typing, nextRound, gameOver, reload } = table;

    if (error !== null) {
        return (
            <View style={styles.failed}>
                <BackButton href={ROUTES.leagueOfLettersIndex} />

                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('lol.lobby.noGame')}
                    message={t(error)}
                >
                    <TextButton text={t('common.retry')} onPress={reload} />
                </InlineNotification>
            </View>
        )
    }

    if (loading || game === null || round === null) {
        return <LoadingPage message={t('lol.game.loading')} />;
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
                onTyping={onTyping}
                typing={typing}
                // Only while there is somewhere to go on to.
                onNextRound={gameOver ? undefined : nextRound}
                onFinish={onFinish}
            />
        </View>
    )
}

interface RoomResultsProps {
    table: MultiplayerGameState,
    isHost: boolean,
    onPlayAgain: () => void,
    playingAgain: boolean,
    error: TranslationKey | null
}

// The end of the game, still inside the room.
function RoomResults({ table, isHost, onPlayAgain, playingAgain, error }: RoomResultsProps) {
    const { user } = useAuth();
    const t = useT();

    const { game, online } = table;

    // Only while the board is still loading, which by this point it is not.
    if (game === null) {
        return <LoadingPage message={t('lol.results.loading')} />;
    }

    return (
        <MultiplayerResults
            game={game}
            userId={user?.id ?? ''}
            online={online}
            isHost={isHost}
            onPlayAgain={onPlayAgain}
            playingAgain={playingAgain}
            error={error}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        flex: 1,
        width: '100%',
        gap: Spacing.two
    },

    // The same, plus the gutters the board lays down for itself.
    failed: {
        flex: 1,
        width: '100%',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.four
    }
}))
