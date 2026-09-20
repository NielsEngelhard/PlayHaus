import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TablePlayerCard from "@/features/pubquizr/components/table/TablePlayerCard";
import type { TablePlayer } from "@/features/pubquizr/multi-device/table-players";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const LABEL_SIZE = 11;
const KIND_SIZE = 26;
/** What one card may take of the row, so five read comfortably and eight still fit. */
const CARD_WIDTH = 210;

export interface TableRound {
    kind: string
    ordinal: number
    total: number
}

interface Props {
    players: TablePlayer[]
    /** The round the table is on, and null in the waiting room. */
    round: TableRound | null
    scale: number
}

// The top of the screen: which round this is, and every player with their score and their job.
export default function TablePlayersBar({ players, round, scale }: Props) {
    const t = useT();
    const styles = useStyles();

    // A card narrows as the table grows, which is what keeps the row from wrapping at eight seats.
    const width = Math.round((CARD_WIDTH * scale) * Math.min(1, 5 / Math.max(players.length, 1)));

    return (
        <View
            style={[
                styles.bar,
                {
                    gap: Math.round(Spacing.three * scale),
                    paddingVertical: Math.round(Spacing.two * scale),
                    paddingHorizontal: Math.round(Spacing.four * scale)
                }
            ]}
        >
            {round !== null && (
                <View style={styles.round}>
                    <AppText style={[styles.label, { fontSize: Math.round(LABEL_SIZE * scale) }]}>
                        {t('pubquizr.table.roundOf', { round: round.ordinal, total: round.total })}
                    </AppText>

                    <AppText style={[styles.kind, { fontSize: Math.round(KIND_SIZE * scale) }]} numberOfLines={1}>
                        {round.kind}
                    </AppText>
                </View>
            )}

            <View style={[styles.players, { gap: Math.round(Spacing.two * scale) }]}>
                {players.map(player => (
                    <TablePlayerCard key={player.seat.seat} player={player} scale={scale} width={width} />
                ))}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    bar: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    round: {
        flexShrink: 0
    },

    label: {
        fontWeight: 900,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    kind: {
        fontWeight: 900,
        letterSpacing: -0.8,
        color: theme.colors.text
    },

    players: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end'
    }
}))
