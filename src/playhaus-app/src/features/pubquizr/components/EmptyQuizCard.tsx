import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

// What stands where the picked quiz would be, before one is chosen.
export default function EmptyQuizCard() {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.card}>
            <AppText style={styles.title}>{t('pubquizr.oneDevice.quiz.empty.title')}</AppText>
            <AppText style={styles.message}>{t('pubquizr.oneDevice.quiz.empty.message')}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        alignItems: 'center',
        gap: 6,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.scheme === 'dark'
            ? 'rgba(23, 23, 31, 0.55)'
            : 'rgba(255, 255, 255, 0.5)'
    },
    title: {
        fontSize: 14.5,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },
    message: {
        maxWidth: 250,
        fontSize: 12,
        lineHeight: 12 * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
