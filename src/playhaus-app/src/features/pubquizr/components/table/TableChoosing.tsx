import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Radii } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { EASY_POINTS, HARD_POINTS } from "@/features/pubquizr/round-six";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const AVATAR = 96;
const TITLE_SIZE = 32;
const PILL_SIZE = 20;
const POINTS_SIZE = 14;

interface Props {
    /** Whose choice it is, and null on a table whose seat has gone. */
    asking: Seat | null
    scale: number
}

// Round 6 before anybody has picked: whose choice it is and what the two sides pay, because there is no question yet.
export default function TableChoosing({ asking, scale }: Props) {
    const t = useT();
    const styles = useStyles();

    const sides = [
        { key: 'easy', label: t('pubquizr.board.easy'), points: EASY_POINTS },
        { key: 'hard', label: t('pubquizr.board.hard'), points: HARD_POINTS }
    ];

    return (
        <View style={[styles.stage, { gap: Math.round(20 * scale) }]}>
            {asking !== null && <SeatAvatar raised seat={asking} size={Math.round(AVATAR * scale)} />}

            <AppText style={[styles.title, { fontSize: Math.round(TITLE_SIZE * scale) }]}>
                {asking === null
                    ? t('pubquizr.table.followPhones')
                    : t('pubquizr.table.choosing', { name: asking.name })}
            </AppText>

            <View style={[styles.sides, { gap: Math.round(12 * scale) }]}>
                {sides.map(side => (
                    <View
                        key={side.key}
                        style={[
                            styles.side,
                            {
                                paddingVertical: Math.round(10 * scale),
                                paddingHorizontal: Math.round(20 * scale),
                                borderRadius: Math.round(Radii.lg * scale)
                            }
                        ]}
                    >
                        <AppText style={[styles.label, { fontSize: Math.round(PILL_SIZE * scale) }]}>
                            {side.label}
                        </AppText>

                        <AppText style={[styles.points, { fontSize: Math.round(POINTS_SIZE * scale) }]}>
                            {side.points === 1
                                ? t('pubquizr.board.onePoint')
                                : t('pubquizr.board.pointsWorth', { points: side.points })}
                        </AppText>
                    </View>
                ))}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },

    title: {
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    sides: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    side: {
        alignItems: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    label: {
        fontWeight: 900,
        color: theme.colors.text
    },

    points: {
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
