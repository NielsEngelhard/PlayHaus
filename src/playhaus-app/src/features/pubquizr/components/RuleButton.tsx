import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Pressable, View } from "react-native";

interface Props {
    text: string,
    onPress: () => void,
    /** Greys the label and stops the press, for a page already on its way. */
    busy?: boolean
}

/**
 * The end of a list, and the way past it: a rule across the column with the label
 * sitting in the gap.
 *
 * Drawn as a divider rather than as a button because that is what it is — the line says
 * the list stops here, and the words say it does not have to. Both places that end a
 * list of quizzes use it: "load older" at the foot of the browse sheet, and "see all" at
 * the foot of the three-row peek on the index. They are the same sentence about two
 * different lists, so they are the same shape.
 */
export default function RuleButton({ text, onPress, busy = false }: Props) {
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            style={styles.button}
        >
            <View style={styles.rule} />

            <AppText style={styles.text}>{text}</AppText>

            <View style={styles.rule} />
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingTop: Spacing.one,
        paddingBottom: 2
    },

    rule: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.boardEmptyBorder
    },

    // The one accent that means "there is more of this" in either scheme: blue on
    // paper, lemon on the dark canvas, which is what `focus` already resolves to.
    text: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.focus
    }
}));
