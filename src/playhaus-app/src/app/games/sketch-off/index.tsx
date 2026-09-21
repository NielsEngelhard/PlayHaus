import GameIndexPage from "@/components/layout/GameIndexPage";
import ModeCard from "@/components/ui/ModeCard";
import { FAKE_FILLER, SKETCH_OFF } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import JoinCodeCard from "@/features/join/components/JoinCodeCard";
import PlayingAsCard from "@/features/league-of-letters/components/PlayingAsCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

export default function SketchOffIndexPage() {
    const styles = useStyles();
    const t = useT();

    return (
        <GameIndexPage
            name={SKETCH_OFF.name}
            icon={SKETCH_OFF.icon}
            gradient={SKETCH_OFF.gradient}
            accentInk={SKETCH_OFF.accentInk}
            description={t('sketchOff.index.description')}
            minMaxPlayers={SKETCH_OFF.minMaxPlayersIndicator}
            deviceMode={SKETCH_OFF.deviceMode}
            durationInMinutes={SKETCH_OFF.minutesAverage}
        >
            {/* The first child is the row the band is cut around, so it has to be the mode cards even when there is only one. */}
            <View style={styles.modes}>
                <ModeCard
                    solid
                    icon='users'
                    gradient={SKETCH_OFF.gradient}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('sketchOff.index.multiplayer.title')}
                    chip={SKETCH_OFF.minMaxPlayersIndicator}
                    description={t('sketchOff.index.multiplayer.description')}
                    action={t('sketchOff.index.multiplayer.action')}
                    navigationUrl={ROUTES.sketchOffCreateRoom}
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
