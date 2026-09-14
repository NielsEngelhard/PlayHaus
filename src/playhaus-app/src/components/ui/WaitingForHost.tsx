import WaitingStage from "@/components/ui/WaitingStage";
import type { Game } from "@/constants/games";
import { useT } from "@/features/i18n/LanguageContext";

interface Props {
    // Whose room is being waited on.
    game: Game,
    /** Whoever opened the room. Named, so the wait has somebody at the end of it. */
    hostName: string
}

// The whole of a guest's screen above the roster.
export default function WaitingForHost({ game, hostName }: Props) {
    const t = useT();

    return (
        <WaitingStage
            game={game}
            title={t('lobby.waitingForHost')}
            message={t('lobby.waitingForHostMessage', { name: hostName })}
        />
    )
}
