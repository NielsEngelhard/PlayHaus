import AppText from '@/components/text/AppText';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { usePressPop } from '@/components/ui/usePressPop';
import { Brand } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

interface Props {
    title: string,
    subtitle: string,
    onPress: () => void,
    disabled?: boolean
}

const CHEVRON_SIZE = 40;

// The way into a day that is still open, in the row the finished day's card would have taken.
export default function DailyPlayCard({ title, subtitle, onPress, disabled = false }: Props) {
    const styles = useStyles();
    const pop = usePressPop();

    return (
        <AnimatedPressable
            onPress={onPress}
            disabled={disabled}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole='button'
            accessibilityLabel={title}
            style={[styles.card, disabled && styles.disabled, pop.animatedStyle]}
        >
            <View style={styles.lines}>
                <AppText style={styles.title}>{title}</AppText>

                <AppText style={styles.subtitle}>{subtitle}</AppText>
            </View>

            <View style={styles.chevron}>
                <Feather name='chevron-right' size={15} color={Brand.ink} />
            </View>
        </AnimatedPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: Brand.primary,
        ...theme.shadows.hard
    },

    disabled: {
        opacity: 0.6
    },

    lines: {
        flex: 1,
        minWidth: 0,
        gap: 1
    },

    // Orange carries ink in both schemes, the way every accent fill does.
    title: {
        fontSize: 16.5,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: Brand.ink
    },

    subtitle: {
        fontSize: 11.5,
        fontWeight: 800,
        color: 'rgba(15, 13, 18, 0.75)'
    },

    chevron: {
        width: CHEVRON_SIZE,
        height: CHEVRON_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 13,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    }
}))
