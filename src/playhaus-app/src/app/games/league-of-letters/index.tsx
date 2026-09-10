import { MAX_LOBBY_PLAYERS, MIN_LOBBY_PLAYERS } from "@/api/calls/league-of-letters-lobby";
import GameIndexPage from "@/components/layout/GameIndexPage";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import JoinCodeCard from "@/features/join/components/JoinCodeCard";
import ModeCard from "@/components/ui/ModeCard";
import PlayingAsCard from "@/features/league-of-letters/components/PlayingAsCard";
import TournamentCard from "@/features/league-of-letters/components/TournamentCard";
import WordOfTheDayCard from "@/features/league-of-letters/components/WordOfTheDayCard";
import { bestOf, useHighScores } from "@/features/league-of-letters/useHighScores";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

export default function LeagueOfLettersIndexPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    // The competitive best, hung on the solo card. Undefined until it arrives, and on an account that has never played one.
    const best = bestOf(useHighScores());

    return (
        <GameIndexPage
            // Broken by hand rather than left to wrap.
            name={'League of\nLetters'}
            icon={LEAGUE_OF_LETTERS.icon}
            gradient={LEAGUE_OF_LETTERS.gradient}
            accentInk={LEAGUE_OF_LETTERS.accentInk}
            description={t('lol.index.description')}
            minMaxPlayers={LEAGUE_OF_LETTERS.minMaxPlayersIndicator}
            deviceMode={LEAGUE_OF_LETTERS.deviceMode}
            durationInMinutes={LEAGUE_OF_LETTERS.minutesAverage}
        >
            {/* The first child is the row the band is cut around, and the daily is what the band should stop on. */}
            <WordOfTheDayCard />

            <View style={styles.modes}>
                <ModeCard
                    solid
                    icon='user'
                    gradient={Gradients.lemon}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('lol.index.solo.title')}
                    chip={best === null ? undefined : t('lol.index.solo.best', { score: best.score })}
                    description={t('lol.index.solo.description')}
                    action={t('lol.index.solo.action')}
                    navigationUrl={ROUTES.leagueOfLettersSoloSettings}
                />

                <ModeCard
                    solid
                    icon='users'
                    gradient={LEAGUE_OF_LETTERS.gradient}
                    iconInk={Brand.ink}
                    highlight={0.35}
                    title={t('lol.index.multiplayer.title')}
                    chip={`${MIN_LOBBY_PLAYERS}-${MAX_LOBBY_PLAYERS}`}
                    description={t('lol.index.multiplayer.description')}
                    action={t('lol.index.multiplayer.action')}
                    navigationUrl={ROUTES.leagueOfLettersCreateRoom}
                />
            </View>

            <View style={styles.tournament}>
                <TournamentCard />
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
        marginTop: Spacing.three - 4,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.three - 4
    },
    tournament: {
        marginTop: Spacing.three - 4
    },
    playingAs: {
        marginTop: Spacing.three
    },
    join: {
        marginTop: Spacing.three
    }
}))
