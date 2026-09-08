import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    /** Whoever the question is with right now. */
    answering: Seat
    /** Who a wrong answer passes it to, or null when this is the last seat to try. */
    nextUp: Seat | null
    // Round 2 only: who becomes the hot seat next no matter which button gets pressed.
    alwaysNextUp?: Seat | null
    /** What taking this question pays, on top of the seat it keeps you in. */
    worth: number
    onVerdict: (correct: boolean) => void
    /** A verdict is already in the air. */
    busy?: boolean
}

// The only decision on the screen: was that right?
export default function VerdictButtons({
    answering,
    nextUp,
    alwaysNextUp = null,
    worth,
    onVerdict,
    busy = false
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const scoring = worth > 0;

    // Round 2 overrides the ordinary "who's next" arithmetic with one name that is true no matter which button gets pressed.
    const handoffSeat = alwaysNextUp ?? nextUp;

    return (
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
    )
}

const useStyles = createThemedStyles(theme => ({
    buttons: {
        flexShrink: 0,
        flexDirection: 'row',
        gap: 11
    },

    button: {
        height: 74,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    wrong: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    wrongLabel: {
        fontSize: 12.5,
        fontWeight: 900,
        color: theme.colors.text
    },

    // Half again as wide as Wrong, and the only colour of the two.
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

    // Same weight and colour as `handoffName` — this is the same row, just without anybody to point an arrow at.
    caption: {
        textAlign: 'center',
        fontSize: 10.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    // Ink at 60%, since the fill under this line is mint in both schemes.
    correctCaption: {
        textAlign: 'center',
        fontSize: 10.5,
        fontWeight: 800,
        color: 'rgba(15, 13, 18, 0.6)'
    },

    // The one thing a quizmaster cannot afford to miss, riding on the button that causes it rather than in a caption read only after the choice is made.
    handoff: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },

    handoffAvatar: {
        width: 16,
        height: 16,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center'
    },

    handoffInitials: {
        fontSize: 7,
        fontWeight: 900
    },

    handoffName: {
        fontSize: 10.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    // The same half-strength every other blocked control in the app wears.
    dimmed: {
        opacity: 0.5
    }
}))
