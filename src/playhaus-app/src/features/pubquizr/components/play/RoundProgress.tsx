import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    round: number
    /** 1-based: question 3 of 20. */
    number: number
    total: number
}

/**
 * How far into the round the table is: named above, counted to the right, drawn
 * underneath.
 *
 * The pips are the part worth having. "Question 3 of 20" is a fact you have to read,
 * and a row of filled and empty bars is the same fact you can take in without looking
 * at it — which matters on a phone being passed round a noisy table.
 */
export default function RoundProgress({ round, number, total }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <AppText style={styles.label}>
                    {t('pubquizr.play.roundLabel', {
                        round,
                        kind: t('pubquizr.play.rounds.open')
                    })}
                </AppText>

                <AppText style={styles.count}>
                    {t('pubquizr.play.questionNumber', { number })}
                    <AppText style={styles.countTotal}>
                        {t('pubquizr.play.questionTotal', { total })}
                    </AppText>
                </AppText>
            </View>

            {/* One pip per question, so the row is the round. Not read out: the count
                above already says the same thing in words. */}
            <View
                style={styles.pips}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                {Array.from({ length: total }, (_, index) => (
                    <View
                        key={index}
                        style={[styles.pip, index < number && styles.pipDone]}
                    />
                ))}
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

    pips: {
        marginTop: 8,
        flexDirection: 'row',
        gap: 3
    },

    pip: {
        flex: 1,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.colors.boardEmptyBorder
    },

    // The scheme's own "this is done" accent — blue on paper, lemon on the dark
    // canvas — which is what `focus` already resolves to everywhere else.
    pipDone: {
        backgroundColor: theme.colors.focus
    }
}))
