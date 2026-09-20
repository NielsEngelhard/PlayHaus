import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const COUNT_SIZE = 64;
const LABEL_SIZE = 20;
const HINT_SIZE = 14;

interface Props {
    /** How many numbers are in. Seats and never numbers: this screen is read by the people still typing. */
    done: number
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    total: number
}

// Round 3 while it is being typed. Who is in is on the players bar in green, so this is the count alone.
export default function TableClosestProgress({ done, scale, total }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={[styles.stage, { gap: Math.round(8 * scale) }]}>
            <AppText style={[styles.count, { fontSize: Math.round(COUNT_SIZE * scale) }]}>
                {`${done} / ${total}`}
            </AppText>

            <AppText style={[styles.label, { fontSize: Math.round(LABEL_SIZE * scale) }]}>
                {t('pubquizr.table.numbersInLabel')}
            </AppText>

            <AppText style={[styles.hint, { fontSize: Math.round(HINT_SIZE * scale) }]}>
                {t('pubquizr.table.typeYours')}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },

    // Tabular figures, so the count does not jitter sideways as numbers land.
    count: {
        fontWeight: 900,
        letterSpacing: -2,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },

    label: {
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
