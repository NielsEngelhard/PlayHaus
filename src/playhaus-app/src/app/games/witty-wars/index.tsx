import GameIndexPage from "@/components/layout/GameIndexPage";
import ModeCard from "@/components/ui/ModeCard";
import { WITTY_WARS } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import JoinCodeCard from "@/features/join/components/JoinCodeCard";
import PlayingAsCard from "@/features/league-of-letters/components/PlayingAsCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

// The game's front door.
export default function WittyWarsIndexPage() {
    const styles = useStyles();
    const t = useT();

    return (
        <GameIndexPage
            name={WITTY_WARS.name}
            icon={WITTY_WARS.icon}
            gradient={WITTY_WARS.gradient}
            accentInk={WITTY_WARS.accentInk}
            description={t('wittyWars.index.description')}
            minMaxPlayers={WITTY_WARS.minMaxPlayersIndicator}
            deviceMode={WITTY_WARS.deviceMode}
            durationInMinutes={WITTY_WARS.minutesAverage}
        >
            {/* The first child is the row the band is cut around, so it has to be the mode cards. */}
            <View style={styles.modes}>
                <ModeCard
                    solid
                    icon='smartphone'
                    gradient={WITTY_WARS.gradient}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('wittyWars.index.multiDevice.title')}
                    description={t('wittyWars.index.multiDevice.description')}
                    action={t('wittyWars.index.multiDevice.action')}
                    navigationUrl={ROUTES.wittyWarsCreateRoom}
                />

                {/* TODO: host screen (play on a TV), disabled until it is built. */}
                <ModeCard
                    solid
                    isDisabled
                    icon='tv'
                    gradient={Gradients.lemon}
                    iconInk={Brand.ink}
                    highlight={0.35}
                    title={t('wittyWars.index.hostScreen.title')}
                    description={t('wittyWars.index.hostScreen.description')}
                    action={t('wittyWars.index.hostScreen.action')}
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
        gap: Spacing.three
    },
    playingAs: {
        marginTop: Spacing.three
    },
    join: {
        marginTop: Spacing.three
    }
}))
