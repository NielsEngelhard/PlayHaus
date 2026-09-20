import AppText from "@/components/text/AppText";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { View } from "react-native";

const DIGITS_SIZE = 44;
const BAR_HEIGHT = 12;
/** The last stretch, where the digits and the bar turn red. */
const HURRY_SECONDS = 10;

interface Props {
    left: number
    seconds: number
    /** Beside the bar: "2 / 5". */
    trailing?: string
}

// The turn's clock as a watching phone draws it: the seconds, and a bar that runs out with them.
export default function BoardClock({ left, seconds, trailing }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const hurry = left <= HURRY_SECONDS;
    const fill = hurry ? theme.colors.destructive : Brand.lemon;
    const share = seconds > 0 ? left / seconds : 0;

    return (
        <View style={styles.clock}>
            <AppText style={[styles.digits, hurry && { color: theme.colors.destructive }]}>{left}</AppText>

            <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.round(share * 100)}%`, backgroundColor: fill }]} />
            </View>

            {trailing !== undefined && <AppText style={styles.trailing}>{trailing}</AppText>}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    clock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },

    // Tabular figures, so the number does not jitter sideways as it counts down.
    digits: {
        minWidth: DIGITS_SIZE,
        fontSize: DIGITS_SIZE,
        fontWeight: 900,
        letterSpacing: -2,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },

    bar: {
        flex: 1,
        height: BAR_HEIGHT,
        overflow: 'hidden',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    fill: {
        height: '100%'
    },

    trailing: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
