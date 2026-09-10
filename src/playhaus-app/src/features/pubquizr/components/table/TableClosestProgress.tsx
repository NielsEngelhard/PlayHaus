import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Everybody round 3 lets type a number, in the order the table answers in. */
    guessing: Seat[]
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    /** Whose numbers are in. Seats and never numbers: this screen is read by the people still typing. */
    seatsIn: number[]
}

// Round 3 while it is being typed: a tick per phone that is done, and no number anywhere.
export default function TableClosestProgress({ guessing, scale, seatsIn }: Props) {
    const styles = useStyles();
    const t = useT();

    const done = guessing.filter(seat => seatsIn.includes(seat.seat)).length;

    return (
        <View style={[styles.stage, { gap: Math.round(16 * scale) }]}>
            <View style={[styles.row, { gap: Math.round(12 * scale) }]}>
                {guessing.map(seat => {
                    const isIn = seatsIn.includes(seat.seat);

                    return (
                        <View key={seat.seat} style={[styles.seat, !isIn && styles.waiting]}>
                            <SeatAvatar raised={isIn} seat={seat} size={Math.round(56 * scale)} />

                            {isIn && (
                                <View
                                    style={[
                                        styles.badge,
                                        {
                                            width: Math.round(22 * scale),
                                            height: Math.round(22 * scale),
                                            right: -Math.round(2 * scale),
                                            bottom: -Math.round(2 * scale)
                                        }
                                    ]}
                                >
                                    <Feather
                                        name="check"
                                        size={Math.round(13 * scale)}
                                        color={Brand.ink}
                                    />
                                </View>
                            )}
                        </View>
                    )
                })}
            </View>

            <AppText style={[styles.count, { fontSize: Math.round(20 * scale) }]}>
                {t('pubquizr.table.numbersIn', { done, total: guessing.length })}
            </AppText>

            <AppText style={[styles.hint, { fontSize: Math.round(14 * scale) }]}>
                {t('pubquizr.table.typeYours')}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center'
    },
    // The badge hangs off the avatar, so the wrapper is what it hangs off.
    seat: {
        position: 'relative'
    },
    // Nothing has arrived from this phone yet, which is a thing to read at a glance and not a thing to worry about.
    waiting: {
        opacity: 0.35
    },
    badge: {
        position: 'absolute',
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },
    count: {
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
