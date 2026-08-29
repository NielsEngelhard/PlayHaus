import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";
import AppText from "./AppText";

interface Props {
    label: string,
    /**
     * Runs a rule out from the label. `true` runs one to the end of the row, for a label
     * that heads the block underneath it; `'around'` runs one either side, for a label
     * that divides one block of a page from the next. Off by default, which is every
     * other caller.
     */
    rule?: boolean | 'around'
    /**
     * Drops the bottom margin, for a label sitting in a row that carries its own
     * spacing — a section header with a count and a button beside it.
     *
     * `'around'` implies it: a divider between two blocks is spaced by the column it
     * sits in, and a margin of its own would push it off centre between them.
     */
    inline?: boolean
    /**
     * What the control below currently says, on the opposite end of the label's line.
     *
     * For a picker whose own answer is a glyph rather than a word — the word-length row
     * reads "4 5 6 7 8", and "5 letters" up here is what turns the chosen one into a
     * sentence. Ignored when a rule is drawn, which already owns that end of the row.
     */
    value?: string
}

export default function Label({ label, rule = false, inline = false, value }: Props) {
    const styles = useStyles();

    const flush = inline || rule === 'around';

    if (rule === false) {
        if (value === undefined) {
            return <AppText style={[styles.label, flush && styles.labelFlush]}>{label}</AppText>
        }

        return (
            // Baselines rather than centres: the two are set at different sizes, and it
            // is the line they sit on that has to match.
            <View style={[styles.valueRow, flush && styles.labelFlush]}>
                <AppText style={[styles.label, styles.labelFlush]}>{label}</AppText>

                <AppText style={styles.value}>{value}</AppText>
            </View>
        )
    }

    return (
        <View style={[styles.row, flush && styles.labelFlush]}>
            {rule === 'around' && <View style={styles.rule} />}

            {/* The label keeps its own bottom margin in the plain case; in a row it would
                push the rule off centre, so the row carries the spacing instead. */}
            <AppText style={[styles.label, styles.labelFlush]}>{label}</AppText>

            <View style={styles.rule} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted,
        marginBottom: Spacing.two
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: Spacing.two
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two,
        marginBottom: Spacing.two
    },
    value: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.textMuted
    },
    labelFlush: {
        marginBottom: 0
    },
    rule: {
        flex: 1,
        height: 2,
        borderRadius: 999,
        backgroundColor: theme.colors.borderMuted
    }
}))
