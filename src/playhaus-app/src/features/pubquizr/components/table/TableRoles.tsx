import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Whoever is being asked, or null when it is not one person's turn. */
    guesser: Seat | null
    /** What the guesser row says instead of a name — 'the rest of the table', and the like. */
    lead?: string
    /** Whoever is reading the question out. */
    quizmaster: Seat | null
    /** The shared screen's type scale — see `table-scale.ts`. */
    scale: number
}

// Who is asking and who is answering. Lives in the top-right corner of the shared screen, in every round.
export default function TableRoles({ guesser, lead, quizmaster, scale }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={[styles.panel, { padding: Math.round(11 * scale), gap: Math.round(9 * scale) }]}>
            <Role label={t('pubquizr.table.quizmaster')} scale={scale} seat={quizmaster} />

            <Role label={t('pubquizr.table.guesser')} lead={lead} scale={scale} seat={guesser} />
        </View>
    )
}

interface RoleProps {
    label: string
    lead?: string
    scale: number
    seat: Seat | null
}

// One role: its name, and whoever is holding it.
function Role({ label, lead, scale, seat }: RoleProps) {
    const styles = useStyles();

    // A dash rather than a blank, so the row keeps its height and the panel does not jump between rounds.
    const name = seat?.name ?? lead ?? '—';

    return (
        <View style={styles.role}>
            <AppText style={[styles.label, { fontSize: Math.round(9 * scale) }]}>{label}</AppText>

            <View style={[styles.holder, { gap: Math.round(8 * scale) }]}>
                {seat !== null && <SeatAvatar seat={seat} size={Math.round(24 * scale)} />}

                <AppText numberOfLines={1} style={[styles.name, { fontSize: Math.round(16 * scale) }]}>
                    {name}
                </AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    panel: {
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },
    role: {
        // Right-aligned: this panel hangs off the screen's right edge.
        alignItems: 'flex-end',
        gap: 3
    },
    label: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    holder: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    name: {
        fontWeight: 900,
        color: theme.colors.text
    }
}))
