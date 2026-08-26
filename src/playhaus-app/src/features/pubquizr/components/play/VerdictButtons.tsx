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
    /**
     * Round 2 only: who becomes the hot seat next no matter which button gets pressed.
     * When this is set it replaces the two conditional lines below with one line that
     * is true either way, because round 2 never lets a correct answer keep the seat.
     */
    alwaysNextUp?: Seat | null
    /** What taking this question pays, on top of the seat it keeps you in. */
    worth: number
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
 * Reached only through `ValidateButton`, which is what stops a thumb finding either of
 * these while the phone is being handed over. Who is answering is said at the top of
 * the board by `TurnStrip` rather than again here — the buttons name them too, but
 * only to a screen reader, where there is no banner overhead to have read it from.
 *
 * The two lines underneath say what each button will actually do before it is pressed.
 * "Wrong" means two quite different things depending on whether there is anybody left
 * to ask, and "correct" is no longer only "score it" — most questions in this round buy
 * nothing but the seat, and which sort this one is has to be readable from here rather
 * than worked out from the number at the top of the board.
 */
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

    return (
        <View style={styles.container}>
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

            {alwaysNextUp !== null ? (
                // Round 2: one line, true either way, so there is nothing for the
                // quizmaster to work out from which button they are about to press.
                <HandoffHint
                    text={t('pubquizr.play.choiceAlwaysPasses', { name: alwaysNextUp.name })}
                    seat={alwaysNextUp}
                />
            ) : (
                <>
                    <AppText style={[styles.hint, scoring && styles.hintScoring]}>
                        {t('pubquizr.play.correctKeepsTurn', { name: answering.name })}
                        {scoring ? ` · ${t('pubquizr.play.worthPoints', { worth })}` : ''}
                    </AppText>

                    {nextUp === null ? (
                        <AppText style={styles.hint}>
                            {t('pubquizr.play.wrongEndsQuestion')}
                        </AppText>
                    ) : (
                        <HandoffHint
                            text={t('pubquizr.play.wrongPassesTo', { name: nextUp.name })}
                            seat={nextUp}
                        />
                    )}
                </>
            )}
        </View>
    )
}

/**
 * The one line a quizmaster cannot afford to miss: who this goes to next. Set apart
 * from the plain caption above it with a bordered pill and the seat's own avatar, so a
 * glance at the screen is enough — reading the sentence should not be the only way to
 * find out.
 */
function HandoffHint({ text, seat }: { text: string, seat: Seat }) {
    const styles = useStyles();

    return (
        <View style={styles.handoff}>
            <Feather name="arrow-right" size={13} color={Brand.ink} />

            <View style={[styles.handoffAvatar, { backgroundColor: seat.swatch.color }]}>
                <AppText style={[styles.handoffInitials, { color: seat.swatch.foreground }]}>
                    {seat.initials}
                </AppText>
            </View>

            <AppText style={styles.handoffText}>{text}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexShrink: 0
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

    // A question that pays says so in the scheme's own accent rather than in the grey
    // the other line wears, because it is the one of the two worth reading twice.
    hintScoring: {
        fontWeight: 800,
        color: theme.colors.text
    },

    // Lemon, the same accent the gate button above this screen wears, because this is
    // the other line a quizmaster cannot afford to skim past.
    handoff: {
        marginTop: 9,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon
    },

    handoffAvatar: {
        width: 20,
        height: 20,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center'
    },

    handoffInitials: {
        fontSize: 9,
        fontWeight: 900
    },

    handoffText: {
        fontSize: 12.5,
        fontWeight: 900,
        color: Brand.ink
    },

    // The same half-strength every other blocked control in the app wears.
    dimmed: {
        opacity: 0.5
    }
}))
