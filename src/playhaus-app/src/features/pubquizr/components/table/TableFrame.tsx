import { useTableScreen } from "@/components/layout/FullScreenContext";
import { Spacing } from "@/constants/theme";
import TablePlayersBar, { type TableRound } from "@/features/pubquizr/components/table/TablePlayersBar";
import TableRulesBar from "@/features/pubquizr/components/table/TableRulesBar";
import type { TablePlayer } from "@/features/pubquizr/multi-device/table-players";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    children: ReactNode
    /** Bottom right, always: the code a latecomer joins on. */
    code: string
    /** One card per player, in seating order, each already told what it is doing. */
    players: TablePlayer[]
    /** The round the table is on, and null in the waiting room. */
    round?: TableRound | null
    /** This round in one sentence, under the stage. */
    rule?: string
    /** The shared screen's type scale — see `table-scale.ts`. */
    scale: number
}

// The shared screen's permanent frame: who is playing along the top, the round's own stage in the middle, and the rules along the foot.
export default function TableFrame({ children, code, players, round = null, rule = '', scale }: Props) {
    const styles = useStyles();

    // Claimed here rather than on the page, so every screen that draws this frame escapes the phone column by drawing it.
    useTableScreen();

    return (
        <View style={styles.screen}>
            <TablePlayersBar players={players} round={round} scale={scale} />

            {/* Never scrolls: a television has no way to reach what falls off it. */}
            <View style={[styles.stage, { padding: Math.round(Spacing.four * scale) }]}>
                {children}
            </View>

            <TableRulesBar code={code} idle={round === null} rule={rule} scale={scale} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        backgroundColor: theme.colors.background
    },

    stage: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center'
    }
}))
