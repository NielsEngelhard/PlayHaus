import { MAX_LOBBY_PLAYERS, MIN_LOBBY_PLAYERS } from "@/api/calls/league-of-letters-lobby";
import SimpleTextHero from "@/components/text/SimpleTextHero";
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
        <View style={styles.container}>
            {/* Broken by hand rather than left to wrap: the design sets the two words on
                their own lines, and letting the column decide would move the break as the
                viewport changes. */}
            <SimpleTextHero
                title={'League of\nLetters'}
                description={t('lol.index.description')}
            />

            <View style={styles.playingAs}>
                <PlayingAsCard />
            </View>

            <View style={styles.modes}>
                <ModeCard
                    icon='cpu'
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
                    gradient={Gradients.primary}
                    iconInk={theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent}
                    highlight={0.35}
                    title={t('lol.index.multiplayer.title')}
                    chip={`${MIN_LOBBY_PLAYERS}-${MAX_LOBBY_PLAYERS}`}
                    description={t('lol.index.multiplayer.description')}
                    action={t('lol.index.multiplayer.action')}
                    navigationUrl={ROUTES.leagueOfLettersCreateRoom}
                />
            </View>

            <View style={styles.join}>
                <JoinCodeCard />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    container: {
        width: '100%'
    },
    playingAs: {
        marginTop: Spacing.three
    },
    modes: {
        marginTop: Spacing.three + 2,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.three - 4
    },
    join: {
        marginTop: Spacing.three
    }
}))
