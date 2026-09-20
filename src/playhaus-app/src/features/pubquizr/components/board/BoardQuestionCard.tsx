import AppText from "@/components/text/AppText";
import { Brand, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const PROMPT_SIZE = 21;
const CAPS_SIZE = 10;

interface Props {
    category?: string
    /** Whose question it is right now, in small caps: "Your turn", "Joep is picking". */
    cue: string
    /** 1-based, and null on a card that does not count questions. */
    number: number | null
    prompt: string
    total: number
    /** What it pays, and 0 for a question worth nothing but the seat. */
    worth: number
}

// The question as a card every phone can read, with none of the reader's controls and never the answer.
export default function BoardQuestionCard({ category, cue, number, prompt, total, worth }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.wrapper}>
            <View pointerEvents="none" style={styles.sheet} />

            <View style={styles.card}>
                <View style={styles.top}>
                    <AppText style={styles.cue} numberOfLines={1}>{cue}</AppText>

                    {category !== undefined && category !== '' && (
                        <View style={styles.category}>
                            <AppText style={styles.categoryText} numberOfLines={1}>{category}</AppText>
                        </View>
                    )}
                </View>

                <AppText style={styles.prompt}>{prompt}</AppText>

                {(number !== null || worth > 0) && (
                    <View style={styles.meta}>
                        {number !== null && (
                            <AppText style={styles.count}>
                                {t('pubquizr.board.questionOf', { number, total })}
                            </AppText>
                        )}

                        {worth > 0 && (
                            <View style={styles.worth}>
                                <AppText style={styles.worthText}>
                                    {worth === 1
                                        ? t('pubquizr.board.onePoint')
                                        : t('pubquizr.board.pointsWorth', { points: worth })}
                                </AppText>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    wrapper: {
        marginBottom: Spacing.two
    },

    // One sheet peeking out underneath, so the card reads as the top of the quiz's pile.
    sheet: {
        position: 'absolute',
        left: Spacing.two,
        right: Spacing.one,
        top: Spacing.two,
        bottom: -Spacing.two,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSelected
    },

    card: {
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },

    top: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },

    cue: {
        flexShrink: 1,
        fontSize: CAPS_SIZE,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.focus
    },

    category: {
        flexShrink: 0,
        maxWidth: '50%',
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.half,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted
    },

    categoryText: {
        fontSize: CAPS_SIZE - 1,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },

    prompt: {
        fontSize: PROMPT_SIZE,
        lineHeight: PROMPT_SIZE * 1.2,
        fontWeight: 900,
        letterSpacing: -0.6,
        color: theme.colors.text
    },

    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    count: {
        fontSize: CAPS_SIZE,
        fontWeight: 900,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    // Lemon in both schemes, so the ink on it reads the same everywhere.
    worth: {
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.half,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    worthText: {
        fontSize: CAPS_SIZE,
        fontWeight: 900,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: Brand.ink
    }
}))
