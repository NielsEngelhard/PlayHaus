import SimpleTextHero from "@/components/text/SimpleTextHero";
import { PUBQUIZR_NAME } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ModeCard from "@/features/league-of-letters/components/ModeCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

export default function QuizzerIndexPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title={PUBQUIZR_NAME}
                description={t('pubquizr.index.description')}
            />

            <View style={styles.modes}>
                <ModeCard
                    icon='smartphone'
                    gradient={Gradients.mint}
                    iconInk={Brand.ink}
                    highlight={0.5}
                    title={t('pubquizr.index.oneDevice.title')}
                    description={t('pubquizr.index.oneDevice.description')}
                    action={t('pubquizr.index.oneDevice.action')}
                    navigationUrl={ROUTES.quizzerOneDeviceGameSettings}
                />

                <ModeCard
                    icon='users'
                    gradient={Gradients.secondary}
                    iconInk={theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent}
                    highlight={0.35}
                    title={t('pubquizr.index.multiDevice.title')}
                    description={t('pubquizr.index.multiDevice.description')}
                    action={t('pubquizr.index.multiDevice.action')}
                    isDisabled={true}
                />
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

