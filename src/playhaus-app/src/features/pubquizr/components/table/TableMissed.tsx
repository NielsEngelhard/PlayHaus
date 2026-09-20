import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const LABEL_SIZE = 10;
const AVATAR = 30;

interface Props {
    missed: Seat[]
    scale: number
}

// Everybody the question has already beaten, in the order it reached them.
export default function TableMissed({ missed, scale }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={[styles.row, { gap: Math.round(10 * scale) }]}>
            <AppText style={[styles.label, { fontSize: Math.round(LABEL_SIZE * scale) }]}>
                {t('pubquizr.table.missed')}
            </AppText>

            {missed.map(seat => (
                <View key={seat.seat} style={styles.faded}>
                    <SeatAvatar seat={seat} size={Math.round(AVATAR * scale)} />
                </View>
            ))}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },

    // Struck out is not a thing an avatar can be, so a miss reads as faded instead.
    faded: {
        opacity: 0.45
    }
}))
