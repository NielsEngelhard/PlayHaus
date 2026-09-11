import AppText from "@/components/text/AppText";
import BackButton from "@/components/ui/BackButton";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

export default function NotFoundPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.container}>
            <View style={styles.tile}>
                <Feather name='compass' size={28} color={theme.colors.textMuted} />
            </View>

            <AppText style={styles.title}>{t('notFound.title')}</AppText>

            <AppText style={styles.message}>{t('notFound.message')}</AppText>

            <BackButton href={ROUTES.home} label={t('notFound.action')} variant='primary' />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.six
    },
    tile: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },
    title: {
        fontSize: 20,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },
    message: {
        maxWidth: 260,
        fontSize: 13,
        lineHeight: 13 * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
