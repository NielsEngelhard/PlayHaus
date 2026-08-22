import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    title: string
    /**
     * Left out on the gate's first screen, which has nothing before it. The row then
     * carries the title alone rather than an arrow with nowhere to go.
     */
    onBack?: () => void
    /** Set while a request is in flight, so nobody navigates out from under it. */
    disabled?: boolean
}

/**
 * Title row for a form inside the auth gate, with the way back to the step before
 * it.
 *
 * Not the shared `BackButton`: that one is a `Link` to a route, and these steps
 * are views inside a modal that has no route of its own.
 */
export default function AuthFormHeader({ title, onBack, disabled = false }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.row}>
            {onBack !== undefined && (
                <Pressable
                    onPress={onBack}
                    disabled={disabled}
                    accessibilityRole='button'
                    accessibilityLabel={t('common.back')}
                    style={[styles.backButton, disabled && styles.disabled]}
                >
                    <Feather name='arrow-left' size={18} color={theme.colors.text} />
                </Pressable>
            )}

            <AppText style={styles.title}>{title}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    backButton: {
        width: 38,
        height: 38,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 12,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    disabled: {
        opacity: 0.5
    },
    title: {
        // Without this a long title pushes the arrow off the card instead of wrapping.
        flex: 1,
        fontSize: FontSizes.xl,
        fontWeight: 900
    }
}))
