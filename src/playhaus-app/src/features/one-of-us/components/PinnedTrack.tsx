import AppText from '@/components/text/AppText';
import { tiltFor } from '@/features/one-of-us/board-notes';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { View } from 'react-native';

interface Props {
    /** How many briefjes are already hanging. */
    done: number
    label: string
    total: number
}

// The board filling up, as paper rather than as a fraction.
export default function PinnedTrack({ done, label, total }: Props) {
    const styles = useStyles();

    const slots = Math.max(total, done);

    return (
        <View style={styles.track}>
            <AppText style={styles.label}>{label}</AppText>

            <View
                style={styles.row}
                accessibilityLabel={label}
                accessibilityValue={{ now: done, max: slots }}
            >
                {Array.from({ length: slots }, (_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.slot,
                            index < done ? styles.hung : styles.empty,
                            index < done && { transform: [{ rotate: tiltFor(index) }] }
                        ]}
                    />
                ))}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    track: {
        gap: 8
    },

    label: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    row: {
        flexDirection: 'row',
        gap: 6
    },

    slot: {
        flex: 1,
        height: 44,
        borderRadius: 4,
        borderWidth: theme.borderWidth
    },

    hung: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // Nothing pinned here yet, so it is an outline rather than a surface.
    empty: {
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    }
}))
