import AppText from '@/components/text/AppText';
import { Brand, Gradients, linearGradient, withAlpha } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    eyebrow: string,
    title: string,
    onBack: () => void,
    backLabel: string
}

const CHIP_SIZE = 30;

// The top of the day's page: the game's orange, which day it is, and the way back.
export default function WordOfTheDayHero({ eyebrow, title, onBack, backLabel }: Props) {
    const styles = useStyles();

    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.hero,
            linearGradient(Gradients.primary),
            { paddingTop: insets.top + 12 }
        ]}>
            <Pressable
                onPress={onBack}
                accessibilityRole='button'
                accessibilityLabel={backLabel}
                style={styles.chip}
            >
                <Feather name='chevron-left' size={16} color={Brand.textOnAccent} />
            </Pressable>

            <View style={styles.lines}>
                <AppText style={styles.eyebrow}>{eyebrow}</AppText>

                <AppText style={styles.title}>{title}</AppText>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    hero: {
        gap: 9,
        paddingHorizontal: 15,
        paddingBottom: 30,
        borderBottomWidth: theme.borderWidth,
        // Ink in both schemes: the header is the orange, not the page.
        borderBottomColor: Brand.ink,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28
    },

    // A wash on the orange rather than the app's hard-edged button.
    chip: {
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: withAlpha(Brand.ink, 0.22)
    },

    lines: {
        gap: 3
    },

    eyebrow: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: withAlpha(Brand.textOnAccent, 0.85)
    },

    title: {
        fontSize: 26,
        lineHeight: 27,
        fontWeight: 900,
        letterSpacing: -1.1,
        color: Brand.textOnAccent
    }
}))
