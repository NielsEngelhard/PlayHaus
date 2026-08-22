import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    onLogout: () => void
}

export default function LogoutCard({ onLogout }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <Card>
            <AppText style={styles.label}>{t('profile.logout')}</AppText>

            <View style={styles.buttonRow}>
                <Pressable
                    onPress={onLogout}
                    accessibilityRole='button'
                    accessibilityLabel={t('profile.logout')}
                    style={styles.button}
                >
                    <Feather name='log-out' size={16} color={theme.colors.textOnAccent} />
                    <AppText style={styles.buttonText}>{t('profile.logout')}</AppText>
                </Pressable>
            </View>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    // The button hugs its text rather than filling the card, so it needs a row to sit
    // at the start of.
    buttonRow: {
        marginTop: Spacing.three,
        flexDirection: 'row'
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two + Spacing.one,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.destructive,
        ...theme.shadows.hard
    },
    buttonText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textOnAccent
    }
}))
