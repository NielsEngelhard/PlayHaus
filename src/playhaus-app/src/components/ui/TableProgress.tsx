import AppText from "@/components/text/AppText";
import type { LobbySeat } from "@/components/ui/lobby-seat";
import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    players: LobbySeat[],
    // The "3 of 6 in" line beside the swatches.
    label: string
}

// How far each swatch in the stack sits over the one before it.
const STACK_OVERLAP = -7;
// Past this many the stack stops growing and starts counting.
const STACK_SHOWN = 4;
const SWATCH_SIZE = 20;

// The table, as a huddle of swatches, and how far along it is.
export default function TableProgress({ players, label }: Props) {
    const styles = useStyles();

    const shown = players.slice(0, STACK_SHOWN);
    const rest = players.length - shown.length;

    return (
        <View style={styles.progress}>
            <View style={styles.stack}>
                {shown.map((player, index) => (
                    <View
                        key={player.userId}
                        style={[
                            styles.swatch,
                            { backgroundColor: avatarColorById(player.avatarColorId).color },
                            index > 0 && { marginLeft: STACK_OVERLAP }
                        ]}
                    />
                ))}
            </View>

            {rest > 0 && <AppText style={styles.progressText}>{'+' + rest}</AppText>}

            <AppText style={styles.progressText}>{label}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    progress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    stack: {
        flexDirection: 'row'
    },
    // Ringed in the page's own colour, so the swatches read as stacked rather than as touching.
    swatch: {
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.background
    },
    // Tabular, so the left-hand digit does not twitch as answers land.
    progressText: {
        flexShrink: 1,
        fontSize: 11.5,
        fontWeight: 700,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    }
}))
