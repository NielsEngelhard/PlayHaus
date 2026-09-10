import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The two the finale is between, in the order the round opened them. */
    finalists: [Seat, Seat]
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
}

// Both finalists at once, which the roles corner cannot do: that only ever names whoever is being asked.
export default function TableFinalists({ finalists, scale }: Props) {
    const styles = useStyles();
    const t = useT();

    const [first, second] = finalists;

    return (
        <View style={[styles.row, { gap: Math.round(16 * scale) }]}>
            <Finalist scale={scale} seat={first} />

            <AppText style={[styles.versus, { fontSize: Math.round(13 * scale) }]}>
                {t('pubquizr.play.intro.versus')}
            </AppText>

            <Finalist scale={scale} seat={second} />
        </View>
    )
}

interface FinalistProps {
    scale: number
    seat: Seat
}

// One of the two, as a face and a name.
function Finalist({ scale, seat }: FinalistProps) {
    const styles = useStyles();

    return (
        <View style={[styles.finalist, { gap: Math.round(9 * scale) }]}>
            <SeatAvatar raised seat={seat} size={Math.round(40 * scale)} />

            <AppText numberOfLines={1} style={[styles.name, { fontSize: Math.round(20 * scale) }]}>
                {seat.name}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    finalist: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    name: {
        fontWeight: 900,
        color: theme.colors.text
    },
    versus: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    }
}))
