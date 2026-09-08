import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

// Where the control is standing.
type Variant = 'icon' | 'pill';

interface Props {
    onPress: () => void
    variant?: Variant
    /** A request is in the air. The pill says so; `disabled` does the blocking. */
    busy?: boolean
    disabled?: boolean
}

// Ask the server again.
export default function RefreshButton({
    onPress,
    variant = 'icon',
    busy = false,
    disabled = false
}: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const icon = <Feather name='refresh-cw' size={13} color={theme.colors.text} />;

    return (
        <PopPressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={t('reconnect.refresh.label')}
            accessibilityState={{ disabled, busy }}
            style={[
                variant === 'icon' ? styles.circle : styles.pill,
                disabled && styles.disabled
            ]}
        >
            {variant === 'icon' ? icon : (
                <View style={styles.row}>
                    {icon}

                    <AppText style={styles.label}>
                        {busy ? t('common.busy') : t('reconnect.refresh.action')}
                    </AppText>
                </View>
            )}
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    circle: {
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        // A rung quieter than a card's outline: it sits in a label row, not on the page.
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center'
    },
    pill: {
        alignSelf: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingVertical: 8,
        paddingHorizontal: 14,
        // Light keeps the hard lift its chrome has.
        ...theme.shadows.hardSmall
    },
    // The same half-strength every other blocked control in the app wears.
    disabled: {
        opacity: 0.5
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },
    label: {
        fontSize: 12.5,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
