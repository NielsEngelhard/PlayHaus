import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    /** Whoever is holding the phone and reading. */
    quizmaster: Seat
    onClose: () => void
}

/**
 * The top of the board: the way out, and a reminder of whose phone this is.
 *
 * The badge is not decoration. This screen shows the answers, so the one thing it has
 * to keep saying is which person is allowed to be looking at it — the name on the pill
 * is the check anyone at the table can make at a glance.
 */
export default function PlayHeader({ quizmaster, onClose }: Props) {
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

            <View style={styles.badge}>
                <View style={[styles.avatar, { backgroundColor: quizmaster.swatch.color }]}>
                    <AppText style={[styles.initials, { color: quizmaster.swatch.foreground }]}>
                        {quizmaster.initials}
                    </AppText>
                </View>

                <AppText style={styles.badgeText}>
                    {t('pubquizr.play.youAreQuizmaster')}
                </AppText>
            </View>
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

    // Lemon in both schemes: it is the one thing on the board that has to be found
    // without reading it, and the badge means the same thing whatever the canvas.
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingLeft: 5,
        paddingRight: 11,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.lemon,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    avatar: {
        width: 24,
        height: 24,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },

    initials: {
        fontSize: 9.5,
        fontWeight: 900
    },

    // Ink on lemon in both schemes, because the pill itself is lemon in both.
    badgeText: {
        fontSize: 11.5,
        fontWeight: 900,
        letterSpacing: 0.3,
        color: Brand.ink
    }
}))
