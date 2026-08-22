import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    onPress: () => void
    /** A request is in the air. The label says so; `disabled` does the blocking. */
    busy?: boolean
    disabled?: boolean
}

/**
 * Ask the server again, at the bottom of the page.
 *
 * Deliberately quieter than an `ActionButton`: the point of this page is the game
 * you go back into, and a reload is housekeeping. It is outlined rather than filled
 * so it closes the page without competing with the row above it.
 *
 * It goes half-strength for a moment after every press — long enough that leaning on
 * it does nothing, quiet enough that it never explains itself.
 */
export default function RefreshBar({ onPress, busy = false, disabled = false }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={t('reconnect.refresh.label')}
            accessibilityState={{ disabled, busy }}
            style={[styles.bar, disabled && styles.disabled]}
        >
            <View style={styles.row}>
                <Feather name='refresh-cw' size={16} color={theme.colors.text} />

                <AppText style={styles.label}>{busy ? t('common.busy') : t('reconnect.refresh.action')}</AppText>
            </View>
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    bar: {
        height: 50,
        width: '100%',
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        // Light keeps the hard lift its chrome has; dark leaves this flat, saving the
        // coloured shadows for the cards that are the point of the page.
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    // The same half-strength every other blocked control in the app wears.
    disabled: {
        opacity: 0.5
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },
    label: {
        fontSize: 14,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
