import BackChip from '@/components/layout/BackChip';
import AppText from '@/components/text/AppText';
import { LEAGUE_OF_LETTERS } from '@/constants/games';
import { Brand, ContentWidth, Gradients, linearGradient, withAlpha } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    eyebrow: string,
    title: string,
    /** Where the way back goes. */
    back: Href,
    // Takes the chip over, for a `replace` rather than the `Link`'s `push`.
    onBack?: () => void,
    streak: number,
    streakLabel: string
}

// How far the hero's contents stay from the column's edges, whatever the fill does behind them.
const GUTTER = 15;

// The top of the day's page: the game's orange, which month it is, the run of days, and the way back.
export default function WordOfTheDayHero({ eyebrow, title, back, onBack, streak, streakLabel }: Props) {
    const styles = useStyles();

    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();

    // How far past the chromeless column the fill has to reach to make the window, and so also whether it is reaching at all.
    const bleed = Platform.OS === 'web'
        ? Math.max(0, Math.ceil((windowWidth - ContentWidth) / 2))
        : 0;

    return (
        <View style={[
            styles.hero,
            // Square once the fill runs off the sides of the window: a corner rounded against an edge it never touches reads as a mistake.
            bleed > 0 && styles.heroWide,
            linearGradient(Gradients.primary),
            {
                paddingTop: insets.top + 12,
                marginHorizontal: -bleed,
                paddingHorizontal: bleed + GUTTER
            }
        ]}>
            <BackChip href={back} onPress={onBack} variant='band' />

            <View style={styles.row}>
                <View style={styles.lines}>
                    <AppText style={styles.eyebrow}>{eyebrow}</AppText>

                    <View style={styles.titleRow}>
                        <Image
                            source={LEAGUE_OF_LETTERS.icon}
                            style={styles.mark}
                            accessibilityRole='image'
                            accessibilityLabel={LEAGUE_OF_LETTERS.name}
                        />

                        <AppText style={styles.title}>{title}</AppText>
                    </View>
                </View>

                <View style={styles.streak} accessibilityLabel={streakLabel}>
                    <Ionicons name='flame' size={14} color={Brand.primary} />

                    <AppText style={styles.streakCount}>{streak}</AppText>
                </View>
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    hero: {
        gap: 9,
        paddingBottom: 30,
        borderBottomWidth: theme.borderWidth,
        // Ink in both schemes: the header is the orange, not the page.
        borderBottomColor: Brand.ink,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28
    },

    heroWide: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0
    },

    row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10
    },

    lines: {
        flex: 1,
        minWidth: 0,
        gap: 3
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },

    mark: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 6
    },

    // Paper and ink on the orange, so the run of days reads as a badge pinned to the header rather than part of it.
    streak: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    streakCount: {
        fontSize: 14,
        fontWeight: 900,
        color: Brand.ink
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
