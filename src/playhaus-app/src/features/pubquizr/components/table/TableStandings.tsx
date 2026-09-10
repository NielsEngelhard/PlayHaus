import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    /** Best first. See `standingsOf`. */
    standings: Seat[]
}

// Where the table stands between rounds. Chips rather than a column, because the screen's spare space is horizontal and eight rows will not fit under a round's rules.
export default function TableStandings({ scale, standings }: Props) {
    const styles = useStyles();
    const t = useT();

    const top = standings[0];
    // A joint lead paints nobody: there is no one seat to point at.
    const leading = top !== undefined
        && standings.filter(seat => seat.score === top.score).length === 1
        ? top.seat
        : null;

    return (
        <View style={[styles.block, { gap: Math.round(10 * scale) }]}>
            <AppText style={[styles.label, { fontSize: Math.round(9 * scale) }]}>
                {t('pubquizr.table.standings')}
            </AppText>

            <View style={[styles.chips, { gap: Math.round(8 * scale) }]}>
                {standings.map(seat => {
                    const lead = seat.seat === leading;

                    return (
                        <View
                            key={seat.seat}
                            style={[
                                styles.chip,
                                lead && styles.leading,
                                {
                                    gap: Math.round(8 * scale),
                                    paddingVertical: Math.round(6 * scale),
                                    paddingHorizontal: Math.round(10 * scale)
                                }
                            ]}
                        >
                            <SeatAvatar seat={seat} size={Math.round(28 * scale)} />

                            <AppText
                                numberOfLines={1}
                                style={[
                                    styles.name,
                                    lead && styles.onLemon,
                                    { fontSize: Math.round(15 * scale) }
                                ]}
                            >
                                {seat.name}
                            </AppText>

                            <AppText
                                style={[
                                    styles.score,
                                    lead && styles.onLemon,
                                    { fontSize: Math.round(20 * scale) }
                                ]}
                            >
                                {seat.score}
                            </AppText>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    block: {
        alignItems: 'center'
    },
    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },
    // Lemon in both schemes, the same "this one" the winner's card wears.
    leading: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.lemon
    },
    name: {
        fontWeight: 800,
        letterSpacing: -0.2,
        color: theme.colors.text
    },
    score: {
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },
    onLemon: {
        color: Brand.ink
    }
}))
