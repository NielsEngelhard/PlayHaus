import { MAX_LOBBY_PLAYERS, MIN_LOBBY_PLAYERS } from "@/api/calls/league-of-letters-lobby";
import GameIndexPage from "@/components/layout/GameIndexPage";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ModeCard from "@/features/league-of-letters/components/ModeCard";
import PlayingAsCard from "@/features/league-of-letters/components/PlayingAsCard";
import JoinCodeCard from "@/features/reconnect/components/JoinCodeCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

export default function LeagueOfLettersIndexPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <GameIndexPage
            // Broken by hand rather than left to wrap: the design sets the two words on
            // their own lines, and letting the column decide would move the break as the
            // viewport changes.
            name={'League of\nLetters'}
            icon={LEAGUE_OF_LETTERS.icon}
            gradient={LEAGUE_OF_LETTERS.gradient}
            accentInk={LEAGUE_OF_LETTERS.accentInk}
            description={t('lol.index.description')}
            minMaxPlayers={LEAGUE_OF_LETTERS.minMaxPlayersIndicator}
            deviceMode={LEAGUE_OF_LETTERS.deviceMode}
            durationInMinutes={LEAGUE_OF_LETTERS.minutesAverage}
        >
            <View style={styles.modes}>
                <ModeCard
                    icon='user'
                    gradient={Gradients.lemon}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('lol.index.solo.title')}
                    description={t('lol.index.solo.description')}
                    action={t('lol.index.solo.action')}
                    navigationUrl={ROUTES.leagueOfLettersSoloSettings}
                />

                <ModeCard
                    icon='users'
                    gradient={LEAGUE_OF_LETTERS.gradient}
                    iconInk={theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent}
                    highlight={0.35}
                    title={t('lol.index.multiplayer.title')}
                    chip={`${MIN_LOBBY_PLAYERS}-${MAX_LOBBY_PLAYERS}`}
                    description={t('lol.index.multiplayer.description')}
                    action={t('lol.index.multiplayer.action')}
                    navigationUrl={ROUTES.leagueOfLettersCreateRoom}
                />
            </View>

            <View style={styles.playingAs}>
                <PlayingAsCard />
            </View>

            <View style={styles.join}>
                <JoinCodeCard />
            </View>
        </GameIndexPage>
    )
}

const useStyles = createThemedStyles(() => ({
    modes: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.three - 4
    },
    playingAs: {
        marginTop: Spacing.three
    },
    join: {
        marginTop: Spacing.three
    }
}))
