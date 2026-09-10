import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** What the table is waiting for, in a sentence. */
    message: string
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    /** Whoever it is waiting on, and null when it is not one person. */
    seat?: Seat | null
}

// The screen's most-used stage: a name, and what everybody is waiting for them to do.
export default function TableWaiting({ message, scale, seat = null }: Props) {
    const styles = useStyles();

    return (
        <View style={[styles.stage, { gap: Math.round(18 * scale) }]}>
            {seat !== null && <SeatAvatar raised seat={seat} size={Math.round(76 * scale)} />}

            <AppText
                style={[
                    styles.message,
                    { fontSize: Math.round(26 * scale), maxWidth: Math.round(720 * scale) }
                ]}
            >
                {message}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    message: {
        fontWeight: 800,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
