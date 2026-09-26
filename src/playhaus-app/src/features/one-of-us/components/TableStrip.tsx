import SeatAvatar from '@/components/ui/SeatAvatar';
import { Brand, Radii, Spacing } from '@/constants/theme';
import type { Seat } from '@/features/table/seats';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

export type StripMark = 'default' | 'focus' | 'done' | 'out' | 'pending';

interface Props {
    markOf: (seat: Seat) => StripMark
    seats: Seat[]
}

const AVATAR = 40;
const FOCUS = 48;
const BADGE = 18;
const BADGE_ICON = 10;
const DIMMED = 0.45;
// Past this many seats the row wraps rather than running off the band.
const CROWDED = 7;

const HALO = `0 0 0 4px ${Brand.lemon}, 0 0 0 6px ${Brand.ink}`;

// The whole table in seating order, along the bottom of the band.
export default function TableStrip({ markOf, seats }: Props) {
    const styles = useStyles();

    return (
        <View style={[styles.strip, seats.length > CROWDED && styles.crowded]}>
            {seats.map(seat => {
                const mark = markOf(seat);
                const focus = mark === 'focus';

                return (
                    <View
                        key={seat.seat}
                        accessible
                        accessibilityLabel={seat.name}
                        style={(mark === 'out' || mark === 'pending') && styles.dimmed}
                    >
                        <SeatAvatar
                            seat={seat}
                            size={focus ? FOCUS : AVATAR}
                            style={focus ? styles.focusRing : styles.ring}
                        />

                        {(mark === 'done' || mark === 'out') && (
                            <View style={[styles.badge, mark === 'done' ? styles.badgeDone : styles.badgeOut]}>
                                <Feather name={mark === 'done' ? 'check' : 'x'} size={BADGE_ICON} color={Brand.ink} />
                            </View>
                        )}
                    </View>
                )
            })}
        </View>
    )
}

// Ink outlines in both schemes: the strip only ever sits on the pale violet band.
const useStyles = createThemedStyles(theme => ({
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    crowded: {
        flexWrap: 'wrap'
    },
    dimmed: {
        opacity: DIMMED
    },
    ring: {
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    focusRing: {
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        boxShadow: HALO
    },
    badge: {
        position: 'absolute',
        right: -Spacing.one,
        bottom: -Spacing.one,
        width: BADGE,
        height: BADGE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    badgeDone: {
        backgroundColor: Brand.mint
    },
    badgeOut: {
        backgroundColor: Brand.silver
    }
}))
