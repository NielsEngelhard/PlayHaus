import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";
import AppText from "./AppText";

interface Props {
    label: string,
    /**
     * Runs a rule out from the label to the end of the row, for a label that divides a
     * page rather than heading a field. Off by default, which is every other caller.
     */
    rule?: boolean
}

export default function Label({ label, rule = false }: Props) {
    const styles = useStyles();

    if (!rule) {
        return <AppText style={styles.label}>{label}</AppText>
    }

    return (
        <View style={styles.row}>
            {/* The label keeps its own bottom margin in the plain case; in a row it would
                push the rule off centre, so the row carries the spacing instead. */}
            <AppText style={[styles.label, styles.labelInRow]}>{label}</AppText>

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
    labelInRow: {
        marginBottom: 0
    },
    rule: {
        flex: 1,
        height: 2,
        borderRadius: 999,
        backgroundColor: theme.colors.borderMuted
    }
}))
