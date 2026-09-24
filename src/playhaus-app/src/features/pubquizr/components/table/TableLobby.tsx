import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    code: string
    /** How many phones the quiz needs before the host can deal it. */
    minPlayers: number
    /** The shared screen's type scale — see `table-scale.ts`. */
    scale: number
    seats: Seat[]
}

// The waiting room, on the shared screen: how to get in. Who already is in is on the bar above it.
export default function TableLobby({ code, minPlayers, scale, seats }: Props) {
    const styles = useStyles();
    const t = useT();

    const short = Math.max(0, minPlayers - seats.length);

    return (
        <View style={[styles.stage, { gap: Math.round(Spacing.five * scale) }]}>
            <View>
                <AppText style={[styles.label, { fontSize: Math.round(11 * scale) }]}>
                    {t('pubquizr.table.joinAt')}
                </AppText>

                <AppText style={[styles.code, { fontSize: Math.round(72 * scale) }]}>{code}</AppText>

                <AppText style={[styles.hint, { fontSize: Math.round(15 * scale) }]}>
                    {t('pubquizr.table.typeHint')}
                </AppText>
            </View>

            <AppText style={[styles.waiting, { fontSize: Math.round(16 * scale) }]}>
                {short > 0
                    ? t('pubquizr.table.needPlayers', { needed: short })
                    : t('pubquizr.table.waitingForHost')}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    label: {
        textAlign: 'center',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: theme.colors.textMuted
    },
    code: {
        textAlign: 'center',
        fontWeight: 900,
        letterSpacing: 4,
        color: theme.colors.text
    },
    hint: {
        marginTop: Spacing.two,
        textAlign: 'center',
        fontWeight: 500,
        color: theme.colors.textSecondary
    },
    waiting: {
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
