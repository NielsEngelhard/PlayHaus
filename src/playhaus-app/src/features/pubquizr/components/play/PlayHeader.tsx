import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    onClose: () => void
}

/**
 * The top of the board: the way out, and nothing else.
 *
 * There was a "you're quizmaster" pill up here, which said the role without ever saying
 * whose it was — no use at all on a phone that changes hands every question. Both
 * people now live in `TurnBanner`, above the question and named, so this row is left
 * doing the one job it was always best at.
 */
export default function PlayHeader({ onClose }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.header}>
            <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.close')}
                style={styles.close}
            >
                <Feather name="x" size={16} color={theme.colors.text} />
            </Pressable>

        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    header: {
        height: 58,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    close: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

}))
