import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    /** Whoever the question is with right now. */
    answering: Seat
    /** Who a wrong answer passes it to, or null when this is the last seat to try. */
    nextUp: Seat | null
    onVerdict: (correct: boolean) => void
    /** A verdict is already in the air. */
    busy?: boolean
}

/**
 * The only decision on the screen: was that right?
 *
 * Correct is the wider of the two and the only one wearing a colour. They are not
 * equal choices — most answers at a pub table are right, the button is pressed under
 * time pressure by someone also holding a conversation, and the expensive misfire is
 * marking somebody wrong. Weighting the layout is what makes the common press the easy
 * one to hit without looking.
 *
 * The line underneath says what Wrong will actually do before it is pressed, because
 * "wrong" means two quite different things depending on whether there is anybody left
 * to ask.
 */
export default function VerdictButtons({ answering, nextUp, onVerdict, busy = false }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <View style={styles.who}>
                <View style={[styles.avatar, { backgroundColor: answering.swatch.color }]}>
                    <AppText style={[styles.initials, { color: answering.swatch.foreground }]}>
                        {answering.initials}
                    </AppText>
                </View>

                <AppText style={styles.whoText}>
                    {t('pubquizr.play.isAnswering', { name: answering.name })}
                </AppText>
            </View>

            <View style={styles.buttons}>
                <Pressable
                    onPress={() => onVerdict(false)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('pubquizr.play.markWrong', { name: answering.name })}
                    accessibilityState={{ disabled: busy }}
                    style={[styles.button, styles.wrong, busy && styles.dimmed]}
                >
                    <Feather name="x" size={20} color={theme.colors.destructive} />

                    <AppText style={styles.wrongLabel}>{t('pubquizr.play.wrong')}</AppText>
                </Pressable>

                <Pressable
                    onPress={() => onVerdict(true)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('pubquizr.play.markCorrect', { name: answering.name })}
                    accessibilityState={{ disabled: busy }}
                    style={[styles.button, styles.correct, busy && styles.dimmed]}
                >
                    <Feather name="check" size={22} color={Brand.ink} />

                    <AppText style={styles.correctLabel}>{t('pubquizr.play.correct')}</AppText>
                </Pressable>
            </View>

            <AppText style={styles.hint}>
                {nextUp === null
                    ? t('pubquizr.play.wrongEndsQuestion')
                    : t('pubquizr.play.wrongPassesTo', { name: nextUp.name })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexShrink: 0
    },

    who: {
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9
    },

    avatar: {
        width: 32,
        height: 32,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 11,
        fontWeight: 900
    },

    whoText: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: 800,
        color: theme.colors.text
    },

    buttons: {
        flexDirection: 'row',
        gap: 11
    },

    button: {
        height: 66,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    wrong: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    wrongLabel: {
        fontSize: 12.5,
        fontWeight: 900,
        color: theme.colors.text
    },

    // Half again as wide as Wrong, and the only colour of the two. Mint in both
    // schemes, so the answer to "which one is yes" never depends on the canvas.
    correct: {
        flex: 1.5,
        backgroundColor: theme.colors.mint,
        boxShadow: theme.scheme === 'dark'
            ? '0 14px 24px -14px rgba(115, 236, 188, 0.9)'
            : '3px 3px 0 0 rgba(15, 13, 18, 1), 0 14px 24px -14px rgba(115, 236, 188, 0.9)'
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    correctLabel: {
        fontSize: 13.5,
        fontWeight: 900,
        color: Brand.ink
    },

    hint: {
        marginTop: 9,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    },

    // The same half-strength every other blocked control in the app wears.
    dimmed: {
        opacity: 0.5
    }
}))
