import { MAX_LOBBY_PLAYERS, MIN_LOBBY_PLAYERS } from "@/api/calls/league-of-letters-lobby";
import GameModePageBase, { type ModeFact } from "@/components/layout/GameModePageBase";
import ModeOptionCard from "@/components/ui/ModeOptionCard";
import { DEVICE_MODE_KEYS, LEAGUE_OF_LETTERS } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TournamentCard from "@/features/league-of-letters/components/TournamentCard";
import type { RelativePathString } from "expo-router";

// The two ways to play against other people — a room of your own, or a bracket.
export default function LeagueOfLettersMultiplayerModesPage() {
    const t = useT();

    const facts: ModeFact[] = [
        {
            icon: 'users',
            text: `${MIN_LOBBY_PLAYERS}-${MAX_LOBBY_PLAYERS} ${t('common.player.players')}`
        },
        {
            icon: 'smartphone',
            text: t(DEVICE_MODE_KEYS[LEAGUE_OF_LETTERS.deviceMode])
        },
        {
            icon: 'clock',
            text: `±${LEAGUE_OF_LETTERS.minutesAverage} ${t('common.minutes')}`
        }
    ];

    return (
        <GameModePageBase
            game={LEAGUE_OF_LETTERS}
            title={t('lol.modes.multiplayer.title')}
            description={t('lol.modes.multiplayer.description')}
            facts={facts}
            back={ROUTES.leagueOfLettersIndex as RelativePathString}
        >
            <TournamentCard />

            <ModeOptionCard
                layout='row'
                icon='users'
                tint={Brand.mint}
                title={t('lol.modes.multiplayer.own.title')}
                description={t('lol.modes.multiplayer.own.description', { max: MAX_LOBBY_PLAYERS })}
                href={ROUTES.leagueOfLettersCreateRoom as RelativePathString}
            />
        </GameModePageBase>
    )
}
