import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    onClose: () => void
    /** "Round 2 · Multiple choice", which used to be the top line of its own card. */
    label: string
}

/**
 * The top of the board: the way out, and nothing else.
 *
 * There was a "you're quizmaster" pill up here, which said the role without ever saying
 * whose it was — no use at all on a phone that changes hands every question. Both
 * people now live in `TurnStrip`, above the question and named.
 *
 * What is up here instead is which round it is, which cost a whole line of its own card
 * before and costs nothing here: this row was 58 points of a close button and empty
 * space, and the label is the one fact on the board nobody needs to act on.
 */
export default function PlayHeader({ onClose, label }: Props) {
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

            <View style={styles.spacer} />

            <AppText style={styles.label} numberOfLines={1}>{label}</AppText>
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

    spacer: {
        flex: 1
    },

    label: {
        flexShrink: 1,
        fontSize: 11.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    }
}))
