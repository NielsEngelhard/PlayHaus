import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The shared screen's type scale — see `table-scale.ts`. */
    scale: number
    seats: Seat[]
}

// Everybody's score, best first. Lives in the bottom-right corner of the shared screen, in every round.
export default function TableScoreboard({ scale, seats }: Props) {
    const styles = useStyles();
    const t = useT();

    // Sorted here rather than by the caller, so the corner is right whatever feeds it. Scores only move on a settle, which is a moment the table is already looking at.
    const standings = [...seats].sort((a, b) => b.score - a.score || a.seat - b.seat);

    const step = Math.round(6 * scale);

    return (
        <View
            style={[
                styles.panel,
                {
                    minWidth: Math.round(180 * scale),
                    padding: Math.round(11 * scale),
                    gap: step
                }
            ]}
        >
            <AppText style={[styles.label, { fontSize: Math.round(9 * scale) }]}>
                {t('pubquizr.table.scores')}
            </AppText>

            {standings.map(seat => (
                <View key={seat.seat} style={[styles.row, { gap: step + 2 }]}>
                    <SeatAvatar seat={seat} size={Math.round(26 * scale)} />

                    <AppText numberOfLines={1} style={[styles.name, { fontSize: Math.round(14 * scale) }]}>
                        {seat.name}
                    </AppText>

                    <AppText style={[styles.score, { fontSize: Math.round(19 * scale) }]}>
                        {seat.score}
                    </AppText>
                </View>
            ))}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    panel: {
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },
    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    name: {
        // Takes what the avatar and the number leave, so the numbers line up down the right edge.
        flex: 1,
        minWidth: 0,
        fontWeight: 700,
        color: theme.colors.text
    },
    score: {
        fontWeight: 900,
        color: theme.colors.text
    }
}))
