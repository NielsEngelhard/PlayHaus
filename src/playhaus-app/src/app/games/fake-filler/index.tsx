import GameIndexPage from "@/components/layout/GameIndexPage";
import ModeCard from "@/components/ui/ModeCard";
import { FAKE_FILLER } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import JoinCodeCard from "@/features/join/components/JoinCodeCard";
import PlayingAsCard from "@/features/league-of-letters/components/PlayingAsCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

// The game's front door.
export default function FakeFillerIndexPage() {
    const styles = useStyles();
    const t = useT();

    return (
        <GameIndexPage
            name={FAKE_FILLER.name}
            icon={FAKE_FILLER.icon}
            gradient={FAKE_FILLER.gradient}
            accentInk={FAKE_FILLER.accentInk}
            description={t('fakeFiller.index.description')}
            minMaxPlayers={FAKE_FILLER.minMaxPlayersIndicator}
            deviceMode={FAKE_FILLER.deviceMode}
            durationInMinutes={FAKE_FILLER.minutesAverage}
        >
            {/* The first child is the row the band is cut around, so it has to be the mode cards even when there is only one. */}
            <View style={styles.modes}>
                <ModeCard
                    solid
                    icon='users'
                    gradient={FAKE_FILLER.gradient}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('fakeFiller.index.multiplayer.title')}
                    chip={FAKE_FILLER.minMaxPlayersIndicator}
                    description={t('fakeFiller.index.multiplayer.description')}
                    action={t('fakeFiller.index.multiplayer.action')}
                    navigationUrl={ROUTES.fakeFillerCreateRoom}
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
