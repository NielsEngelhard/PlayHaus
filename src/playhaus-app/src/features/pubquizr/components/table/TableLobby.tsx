import AppText from "@/components/text/AppText";
import QrCode from "@/components/ui/QrCode";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { PUBQUIZR } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { joinLink } from "@/features/join/join-link";
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

// The waiting room, on the shared screen: how to get in, and who already is.
export default function TableLobby({ code, minPlayers, scale, seats }: Props) {
    const styles = useStyles();
    const t = useT();

    // The QR goes on the screen and the phones scan it: a laptop camera points away from the room.
    const link = joinLink(PUBQUIZR, code);

    const short = Math.max(0, minPlayers - seats.length);

    return (
        <View style={[styles.stage, { gap: Math.round(Spacing.five * scale) }]}>
            <View style={[styles.invite, { gap: Math.round(Spacing.five * scale) }]}>
                <View style={styles.words}>
                    <AppText style={[styles.label, { fontSize: Math.round(11 * scale) }]}>
                        {t('pubquizr.table.joinAt')}
                    </AppText>

                    <AppText style={[styles.code, { fontSize: Math.round(72 * scale) }]}>{code}</AppText>

                    <AppText style={[styles.hint, { fontSize: Math.round(15 * scale) }]}>
                        {t('pubquizr.table.scanHint')}
                    </AppText>
                </View>

                <QrCode value={link} size={Math.round(200 * scale)} />
            </View>

            <View style={[styles.roster, { gap: Math.round(Spacing.four * scale) }]}>
                {seats.map(seat => (
                    <View key={seat.seat} style={[styles.player, { maxWidth: Math.round(140 * scale) }]}>
                        <SeatAvatar raised seat={seat} size={Math.round(52 * scale)} />

                        <AppText numberOfLines={1} style={[styles.name, { fontSize: Math.round(15 * scale) }]}>
                            {seat.name}
                        </AppText>
                    </View>
                ))}
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
    invite: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    words: {
        // Left-aligned against the code, which is the biggest thing on the screen.
        alignItems: 'flex-start'
    },
    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: theme.colors.textMuted
    },
    code: {
        fontWeight: 900,
        letterSpacing: 4,
        color: theme.colors.text
    },
    hint: {
        marginTop: Spacing.two,
        fontWeight: 500,
        color: theme.colors.textSecondary
    },
    roster: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    player: {
        alignItems: 'center',
        gap: Spacing.two
    },
    name: {
        fontWeight: 800,
        color: theme.colors.text
    },
    waiting: {
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
