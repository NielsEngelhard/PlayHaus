import type { OOUGame } from '@/api/calls/one-of-us-multi-device';
import GameOverScreen from '@/features/one-of-us/components/GameOverScreen';
import { finalPlayersOf } from '@/features/one-of-us/multi-device-flow';

interface Props {
    game: OOUGame
    /** Only the host can open a rematch, so for everybody else this is null and the button is gone. */
    onAgain: (() => void) | null
    onLeave: () => void
}

// The single-device result screen, driven off the multi-device board.
export default function MultiDeviceGameOver({ game, onAgain, onLeave }: Props) {
    return (
        <GameOverScreen
            civiliansWon={game.civiliansWon === true}
            players={finalPlayersOf(game.players)}
            // A finished game is the one moment the pair is public, so an unread board shows blanks rather than a lie.
            word={game.word ?? ''}
            imposterWord={game.imposterWord ?? ''}
            onAgain={onAgain}
            onLeave={onLeave}
        />
    )
}
