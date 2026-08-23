import SimpleTextHero from "@/components/text/SimpleTextHero";
import { ONE_OF_US_NAME } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ModeCard from "@/features/league-of-letters/components/ModeCard";
import JoinCodeCard from "@/features/reconnect/components/JoinCodeCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

export default function OneOfUsIndexPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title={ONE_OF_US_NAME}
                description={t('oneOfUs.index.description')}
            />

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

                <ModeCard
                    icon='users'
                    gradient={Gradients.primary}
                    iconInk={theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent}
                    highlight={0.35}
                    title={t('oneOfUs.index.multiDevice.title')}
                    description={t('oneOfUs.index.multiDevice.description')}
                    action={t('oneOfUs.index.multiDevice.action')}
                    navigationUrl={ROUTES.oneOfUsSetupLobby}
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
