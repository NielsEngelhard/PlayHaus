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
}

export default function Label({ label, rule = false, inline = false }: Props) {
    const styles = useStyles();

    const flush = inline || rule === 'around';

    if (rule === false) {
        return <AppText style={[styles.label, flush && styles.labelFlush]}>{label}</AppText>
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
