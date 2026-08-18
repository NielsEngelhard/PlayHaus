import AppText from "@/components/text/AppText";
import { FontSizes } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { StyleProp, View, ViewStyle } from "react-native";

interface Props {
    /** Straight off `GameRound.roundNumber`. */
    round: number,
    /** Straight off `Game.totalRounds`. */
    total: number,
    /** For layout only — how the counter sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * Which puzzle of how many, above the board.
 *
 * A label over a numeral rather than a badge: the top row already carries a bordered hint
 * and the board below it a notice pill, and a third outlined box would read as one more
 * thing to look at. This wears the same treatment as the clock beside it — tracked label,
 * Outfit Black figure — so the two sit together as one row instead of two ideas.
 */
export default function RoundCounter({ round, total, style }: Props) {
    const styles = useStyles();

    return (
        <View
            style={[styles.block, style]}
            accessible
            accessibilityRole='text'
            accessibilityLabel={`Ronde ${round} van ${total}`}
        >
            <AppText style={styles.label}>Ronde</AppText>

            {/* Two texts rather than one nested in the other: `AppText` resolves the Outfit
                family off its own flattened style, so a nested child would not inherit it. */}
            <View style={styles.figures}>
                <AppText style={styles.current}>{round}</AppText>
                <AppText style={styles.total}>/{total}</AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    block: {
        alignItems: 'center',
        // Holds its size against the timer, which is the flexible one in this row.
        flexShrink: 0
    },
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    figures: {
        flexDirection: 'row',
        alignItems: 'baseline'
    },
    current: {
        // The same size as the clock's figure, so neither one outranks the other.
        fontSize: FontSizes.lg,
        fontWeight: 900,
        // Outfit Black is wide enough to need pulling in, the same as the board's letters.
        letterSpacing: -0.5,
        // A two-digit round would otherwise shift the block as it arrives.
        fontVariant: ['tabular-nums'],
        color: theme.colors.primary
    },
    total: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textSecondary
    }
}))
