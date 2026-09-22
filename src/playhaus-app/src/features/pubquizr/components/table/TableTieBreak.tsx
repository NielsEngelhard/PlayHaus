import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { FinaleTieBreak } from "@/features/pubquizr/round-seven";
import type { Seat } from "@/features/pubquizr/seats";
import { joinNames } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Who taps the winners in on their phone. */
    quizmaster: Seat | null
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    tie: FinaleTieBreak
}

// The draw before the finale, for the room to watch: who is level, and that it is settled by rock paper scissors.
export default function TableTieBreak({ quizmaster, scale, tie }: Props) {
    const styles = useStyles();
    const t = useT();

    const names = joinNames(tie.tied.map(seat => seat.name), t('common.and'));

    return (
        <View style={[styles.stage, { gap: Math.round(14 * scale), maxWidth: Math.round(860 * scale) }]}>
            <AppText style={[styles.kicker, { fontSize: Math.round(11 * scale) }]}>
                {t('pubquizr.play.tieBreak.kicker')}
            </AppText>

            <AppText style={[styles.title, { fontSize: Math.round(40 * scale) }]}>
                {t('pubquizr.play.tieBreak.title')}
            </AppText>

            <View style={[styles.row, { gap: Math.round(20 * scale) }]}>
                {tie.tied.map(seat => (
                    <View key={seat.seat} style={[styles.player, { gap: Math.round(8 * scale) }]}>
                        <SeatAvatar raised seat={seat} size={Math.round(56 * scale)} />
                        <AppText numberOfLines={1} style={[styles.name, { fontSize: Math.round(18 * scale) }]}>
                            {seat.name}
                        </AppText>
                    </View>
                ))}
            </View>

            <AppText style={[styles.brief, { fontSize: Math.round(17 * scale), lineHeight: Math.round(25 * scale) }]}>
                {tie.places === 1
                    ? t('pubquizr.play.tieBreak.bodyOne', { names })
                    : t('pubquizr.play.tieBreak.bodyTwo', { names })}
            </AppText>

            {tie.through.map(seat => (
                <AppText key={seat.seat} style={[styles.brief, { fontSize: Math.round(15 * scale) }]}>
                    {t('pubquizr.play.tieBreak.through', { name: seat.name })}
                </AppText>
            ))}

            {quizmaster !== null && (
                <AppText style={[styles.waiting, { fontSize: Math.round(15 * scale) }]}>
                    {t('pubquizr.play.tieBreak.waiting', { name: quizmaster.name })}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    kicker: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    title: {
        fontWeight: 900,
        letterSpacing: -1.2,
        textAlign: 'center',
        color: theme.colors.text
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    player: {
        alignItems: 'center'
    },
    name: {
        fontWeight: 900,
        color: theme.colors.text
    },
    brief: {
        fontWeight: 600,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    waiting: {
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textMuted
    }
}))
