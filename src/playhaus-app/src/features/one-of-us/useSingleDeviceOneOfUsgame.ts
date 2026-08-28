import { OneOfUsSingleDeviceGame, voteOutPlayerSingleDeviceOneOfUsGame } from "@/api/calls/one-of-us-single-device";
import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface OneOfUsGameState {
    game: OneOfUsSingleDeviceGame | null
    loading: boolean
    gameOver: boolean
    votePlayerOut: (playerId: string) => Promise<void>
}

export function useSingleDeviceOneOfUsgame(gameId: string | null): OneOfUsGameState {
    const { user, status } = useAuth();
    const [gameOver, setGameOver] = useState(false);
    const [game, setGame] = useState<OneOfUsSingleDeviceGame | null>(null);

    const votePlayerOut = useCallback(async (playerId: string) => {
        if (!gameId) return;

        const result = await voteOutPlayerSingleDeviceOneOfUsGame(playerId, gameId);

        if (result?.gameEnded) {
            setGameOver(true);
        }

        setGame(game => {
            if (!game) return game;

            return removePlayerFromGame(game, playerId);
        });

    }, [gameId]);

    const removePlayerFromGame = (game: OneOfUsSingleDeviceGame, playerId: string): OneOfUsSingleDeviceGame => {
        return {
            ...game,
            Players: game.Players.filter(p => p.PlayerId !== playerId),
        };
    };    

    return {
        game: game,
        loading: game == null,
        gameOver,
        votePlayerOut        
    }
} 