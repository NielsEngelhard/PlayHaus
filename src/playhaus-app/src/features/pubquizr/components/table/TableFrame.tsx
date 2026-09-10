import { useTableScreen } from "@/components/layout/FullScreenContext";
import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TableRoles from "@/features/pubquizr/components/table/TableRoles";
import TableScoreboard from "@/features/pubquizr/components/table/TableScoreboard";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    children: ReactNode
    /** Top-left, always: the code a latecomer joins on. */
    code: string
    /** Whoever is being asked, or null when it is not one person's turn. */
    guesser?: Seat | null
    /** The round line. Undefined in the waiting room, which has no round yet. */
    label?: string
    /** What the guesser row says instead of a name. */
    lead?: string
    /** Whoever is reading the question out. Undefined before the evening is dealt, which is when the roles corner appears. */
    quizmaster?: Seat | null
    /** The shared screen's type scale — see `table-scale.ts`. */
    scale: number
    seats: Seat[]
}

// The shared screen's permanent frame: the code and the round in one corner, the roles in another, the scores in a third, and the round's own stage in the middle.
export default function TableFrame({ children, code, guesser, label, lead, quizmaster, scale, seats }: Props) {
    const styles = useStyles();
    const t = useT();

    // Claimed here rather than on the page, so every screen that draws this frame escapes the phone column by drawing it.
    useTableScreen();

    const gutter = Math.round(Spacing.four * scale);

    return (
        <View style={styles.screen}>
            {/* Padded past the corners, so a stage that fills its space still cannot run under them. */}
            <View style={[styles.stage, { padding: gutter, paddingTop: Math.round(90 * scale) }]}>
                {children}
            </View>

            <View style={[styles.corner, { top: gutter, left: gutter }]}>
                {label !== undefined && (
                    <AppText style={[styles.round, { fontSize: Math.round(13 * scale) }]}>{label}</AppText>
                )}

                <AppText style={[styles.joinLabel, { fontSize: Math.round(9 * scale) }]}>
                    {t('pubquizr.table.joinAt')}
                </AppText>

                <AppText style={[styles.code, { fontSize: Math.round(30 * scale) }]}>{code}</AppText>
            </View>

            {quizmaster !== undefined && (
                <View style={[styles.corner, { top: gutter, right: gutter }]}>
                    <TableRoles guesser={guesser ?? null} lead={lead} quizmaster={quizmaster} scale={scale} />
                </View>
            )}

            <View style={[styles.corner, { bottom: gutter, right: gutter }]}>
                <TableScoreboard scale={scale} seats={seats} />
            </View>
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
        alignItems: 'center',
        justifyContent: 'center'
    },
    corner: {
        position: 'absolute'
    },
    round: {
        marginBottom: Spacing.two,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: theme.colors.text
    },
    joinLabel: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    code: {
        fontWeight: 900,
        letterSpacing: 2,
        color: theme.colors.text
    }
}))
