import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import TableTimer from "@/features/pubquizr/components/table/TableTimer";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const AVATAR = 64;
const PAIR_SIZE = 20;
const COUNT_SIZE = 30;
const HINT_SIZE = 15;

interface Props {
    /** How many words the describer has ticked so far. A count and never a word. */
    awarded: number
    describer: Seat
    /** When the describer's clock runs out, and null before it starts. */
    endsAt: number | null
    guesser: Seat
    scale: number
    total: number
}

// Round 4 while the clock runs. The words are the describer's secret, so the table gets a number and two faces.
export default function TableDescribeClock({ awarded, describer, endsAt, guesser, scale, total }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={[styles.stage, { gap: Math.round(20 * scale) }]}>
            <View style={[styles.pair, { gap: Math.round(16 * scale) }]}>
                <View style={[styles.party, { gap: Math.round(8 * scale) }]}>
                    <SeatAvatar seat={describer} size={Math.round(AVATAR * scale)} />

                    <AppText style={[styles.name, { fontSize: Math.round(PAIR_SIZE * scale) }]}>
                        {describer.name}
                    </AppText>
                </View>

                <Feather name="arrow-right" size={Math.round(24 * scale)} color={styles.arrow.color} />

                <View style={[styles.party, { gap: Math.round(8 * scale) }]}>
                    <SeatAvatar seat={guesser} size={Math.round(AVATAR * scale)} />

                    <AppText style={[styles.name, { fontSize: Math.round(PAIR_SIZE * scale) }]}>
                        {guesser.name}
                    </AppText>
                </View>
            </View>

            {endsAt !== null && <TableTimer endsAt={endsAt} scale={scale} />}

            <AppText style={[styles.count, { fontSize: Math.round(COUNT_SIZE * scale) }]}>
                {t('pubquizr.table.gotSoFar', { awarded, total })}
            </AppText>

            <AppText style={[styles.hint, { fontSize: Math.round(HINT_SIZE * scale) }]}>
                {t('pubquizr.table.wordsSecret', { name: describer.name })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },

    pair: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    party: {
        alignItems: 'center'
    },

    arrow: {
        color: theme.colors.textMuted
    },

    name: {
        fontWeight: 900,
        color: theme.colors.text
    },

    count: {
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },

    hint: {
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textMuted
    }
}))
