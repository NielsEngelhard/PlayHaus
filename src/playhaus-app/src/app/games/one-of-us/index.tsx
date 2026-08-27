import GameIndexPage from "@/components/layout/GameIndexPage";
import { ONE_OF_US } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ModeCard from "@/features/league-of-letters/components/ModeCard";
import JoinCodeCard from "@/features/join/components/JoinCodeCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

export default function OneOfUsIndexPage() {
    const styles = useStyles();
    const t = useT();

    return (
        <GameIndexPage
            name={ONE_OF_US.name}
            icon={ONE_OF_US.icon}
            gradient={ONE_OF_US.gradient}
            accentInk={ONE_OF_US.accentInk}
            description={t('oneOfUs.index.description')}
            minMaxPlayers={ONE_OF_US.minMaxPlayersIndicator}
            deviceMode={ONE_OF_US.deviceMode}
            durationInMinutes={ONE_OF_US.minutesAverage}
        >
            <View style={styles.modes}>
                <ModeCard
                    icon='smartphone'
                    gradient={Gradients.lemon}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('oneOfUs.index.oneDevice.title')}
                    description={t('oneOfUs.index.oneDevice.description')}
                    action={t('oneOfUs.index.oneDevice.action')}
                    navigationUrl={ROUTES.oneOfUsSetupSingleDevice}
                />

                {/* The game's own violet rather than the house orange this used to
                    default to — the pair should say which game they belong to. It is the
                    palest accent in the set, so the glyph on it stays ink in both
                    schemes and the lit top edge has to work that much harder. */}
                <ModeCard
                    icon='users'
                    gradient={ONE_OF_US.gradient}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('oneOfUs.index.multiDevice.title')}
                    description={t('oneOfUs.index.multiDevice.description')}
                    action={t('oneOfUs.index.multiDevice.action')}
                    navigationUrl={ROUTES.oneOfUsSetupLobby}
                />
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
    join: {
        marginTop: Spacing.three
    }
}))
