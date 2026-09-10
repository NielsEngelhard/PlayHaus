import AppText from "@/components/text/AppText";
import { Brand, withAlpha } from "@/constants/theme";
import type { ListAnswerSlot } from "@/features/pubquizr/round-five";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The things being looked for, in the order they were written. */
    answers: ListAnswerSlot[]
    /** Which of them the quizmaster has credited so far. */
    awarded: string[]
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
}

// Round 5's answers, filling in as they are credited. One nobody has named yet is a blank, never its text.
export default function TableList({ answers, awarded, scale }: Props) {
    const styles = useStyles();

    const credited = new Set(awarded);

    return (
        <View style={[styles.grid, { gap: Math.round(12 * scale), maxWidth: Math.round(780 * scale) }]}>
            {answers.map(answer => {
                const found = credited.has(answer.id);

                return (
                    <View
                        key={answer.id}
                        style={[
                            styles.slot,
                            found && styles.filled,
                            {
                                minWidth: Math.round(330 * scale),
                                paddingHorizontal: Math.round(18 * scale),
                                paddingVertical: Math.round(13 * scale)
                            }
                        ]}
                    >
                        <AppText
                            numberOfLines={1}
                            style={[
                                found ? styles.text : styles.blank,
                                { fontSize: Math.round(22 * scale) }
                            ]}
                        >
                            {found ? answer.text : '\u2014'}
                        </AppText>
                    </View>
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    slot: {
        flexGrow: 1,
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },
    filled: {
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.mint,
        ...theme.popShadow(theme.colors.shadow)
    },
    // Ink on mint in both schemes, because the fill is mint in both.
    text: {
        fontWeight: 900,
        textAlign: 'center',
        color: Brand.ink
    },
    blank: {
        fontWeight: 900,
        textAlign: 'center',
        color: withAlpha(theme.colors.textMuted, 0.5)
    }
}))
