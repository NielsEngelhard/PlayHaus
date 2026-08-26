import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { ROUND_OPEN, scoresAt } from "@/features/pubquizr/hot-seat";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    round: number
    /** What kind of round it is, for the label: "Round 2 · Multiple choice". */
    kind: string
    /** 1-based: question 3 of 20. */
    number: number
    total: number
    /** What this turn pays whoever takes it. Zero is a question worth only the seat. */
    worth: number
}

/**
 * How far into the round the table is: named above, counted to the right, drawn
 * underneath.
 *
 * The pips are the part worth having. "Question 3 of 20" is a fact you have to read,
 * and a row of filled and empty bars is the same fact you can take in without looking
 * at it — which matters on a phone being passed round a noisy table.
 *
 * In round 1 they carry the scoring rhythm too. Every second question is worth a point,
 * and a row where the paying ones stand taller says that in a way no sentence does: you
 * can see the next point coming from two questions away, which is the whole tension of
 * holding the seat. No other round has a rhythm — every turn of them is worth the same —
 * so the pips there are one height, because a pattern that meant nothing would still be
 * read as meaning something.
 *
 * The badge beside the count says what this turn pays, which is the same fact for whoever
 * is not going to read a bar chart, and the only one of the two a screen reader gets.
 */
export default function RoundProgress({ round, kind, number, total, worth }: Props) {
    const t = useT();
    const styles = useStyles();

    // Only round 1 alternates. Everywhere else every turn pays, so a taller pip would be
    // drawing a distinction the round does not make.
    const rhythmic = round === ROUND_OPEN;
    const scoring = worth > 0;

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <AppText style={styles.label}>
                    {t('pubquizr.play.roundLabel', { round, kind })}
                </AppText>

                <AppText style={styles.count}>
                    {t('pubquizr.play.questionNumber', { number })}
                    <AppText style={styles.countTotal}>
                        {t('pubquizr.play.questionTotal', { total })}
                    </AppText>
                </AppText>
            </View>

            <View style={styles.bottom}>
                {/* One pip per question, so the row is the round. Not read out: the
                    count above and the badge beside it already say it in words. */}
                <View
                    style={styles.pips}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    {Array.from({ length: total }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.pip,
                                // index is 0-based; the pips count turns.
                                rhythmic && scoresAt(index + 1) && styles.pipScoring,
                                index < number && styles.pipDone
                            ]}
                        />
                    ))}
                </View>

                <View style={[styles.badge, scoring && styles.badgeScoring]}>
                    <AppText style={[styles.badgeLabel, scoring && styles.badgeLabelScoring]}>
                        {scoring
                            ? t('pubquizr.play.worthPoints', { worth })
                            : t('pubquizr.play.noPoint')}
                    </AppText>
                </View>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexShrink: 0,
        padding: 11,
        paddingHorizontal: 13,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    top: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8
    },

    label: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
        color: theme.colors.textMuted
    },

    count: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.text
    },

    countTotal: {
        color: theme.colors.textMuted
    },

    bottom: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    pips: {
        flex: 1,
        flexDirection: 'row',
        // Bottom-aligned so the taller scoring pips grow upwards off one baseline,
        // which is what makes the row read as a rhythm rather than as noise.
        alignItems: 'flex-end',
        gap: 3,
        height: 9
    },

    pip: {
        flex: 1,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.colors.boardEmptyBorder
    },

    // The ones that pay. Taller rather than another colour: colour is already saying
    // "done" along this row, and a second colour on the same bars would be two facts
    // fighting over one shape.
    pipScoring: {
        height: 9
    },

    // The scheme's own "this is done" accent — blue on paper, lemon on the dark
    // canvas — which is what `focus` already resolves to everywhere else.
    pipDone: {
        backgroundColor: theme.colors.focus
    },

    badge: {
        flexShrink: 0,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    // Mint in both schemes, the same "yes, this one counts" the Correct button wears,
    // so the two agree about what a scoring question looks like.
    badgeScoring: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint
    },

    badgeLabel: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.9,
        color: theme.colors.textMuted
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    badgeLabelScoring: {
        color: Brand.ink
    }
}))
