import AppText from '@/components/text/AppText';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { usePressPop } from '@/components/ui/usePressPop';
import { Brand, FontSizes, Gradients, linearGradient, Radii, Spacing, withAlpha } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    children?: ReactNode
    closeLabel: string
    // The paper chip on the right: "3/6", "5 in".
    count: string
    label: string
    onClose: () => void
    title: string
}

const CLOSE = 32;

// The violet card on top of every single-device board: the way out, where the round is, and what the table does now.
export default function OouBand({ children, closeLabel, count, label, onClose, title }: Props) {
    const styles = useStyles();
    const pop = usePressPop();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.band, { marginTop: insets.top + Spacing.three }]}>
            <View style={styles.row}>
                <AnimatedPressable
                    onPress={onClose}
                    onPressIn={pop.onPressIn}
                    onPressOut={pop.onPressOut}
                    onHoverIn={pop.onHoverIn}
                    onHoverOut={pop.onHoverOut}
                    accessibilityRole='button'
                    accessibilityLabel={closeLabel}
                    style={[styles.close, pop.animatedStyle]}
                >
                    <Feather name='x' size={FontSizes.md} color={Brand.ink} />
                </AnimatedPressable>

                <AppText style={styles.label} numberOfLines={1}>{label}</AppText>

                <View style={styles.count}>
                    <AppText style={styles.countText}>{count}</AppText>
                </View>
            </View>

            <AppText style={styles.title} accessibilityRole='header'>{title}</AppText>

            {children}
        </View>
    )
}

// The band is pale violet in both schemes, so everything on it is drawn in ink in both.
const useStyles = createThemedStyles(theme => ({
    band: {
        flexShrink: 0,
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radii.band,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        ...linearGradient(Gradients.violet),
        ...theme.shadows.hard
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    close: {
        width: CLOSE,
        height: CLOSE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        backgroundColor: withAlpha(Brand.ink, 0.12)
    },
    label: {
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: withAlpha(Brand.ink, 0.72)
    },
    count: {
        flexShrink: 0,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.sm,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },
    countText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: Brand.ink
    },
    title: {
        fontSize: FontSizes.xxl,
        lineHeight: FontSizes.xxl * 1.1,
        fontWeight: 900,
        letterSpacing: -1,
        color: Brand.ink
    }
}))
