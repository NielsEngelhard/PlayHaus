import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import RefreshButton from "@/features/reconnect/components/RefreshButton";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    onRefresh: () => void
    busy?: boolean
    disabled?: boolean
}

// What stands where the list of open games would be, when there are none.
export default function NoGamesCard({ onRefresh, busy = false, disabled = false }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.card}>
            <View style={styles.tile}>
                <Feather name='wifi' size={20} color={theme.colors.textMuted} />
            </View>

            <AppText style={styles.title}>{t('reconnect.empty.title')}</AppText>

            <AppText style={styles.message}>{t('reconnect.empty.message')}</AppText>

            <RefreshButton
                variant='pill'
                onPress={onRefresh}
                busy={busy}
                disabled={disabled}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        alignItems: 'center',
        gap: 9,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        // The same thin wash every other empty slot in the app wears.
        backgroundColor: theme.scheme === 'dark'
            ? 'rgba(23, 23, 31, 0.55)'
            : 'rgba(255, 255, 255, 0.5)'
    },
    tile: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
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
