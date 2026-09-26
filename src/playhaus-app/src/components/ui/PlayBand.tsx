import AccentBand from "@/components/layout/AccentBand";
import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import type { Game } from "@/constants/games";
import { accentInkColor, Spacing, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    // Whose band this is: the fill, and the ink that reads on it.
    game: Game,
    onClose: () => void,
    closeLabel: string,
    label: string,
    // The "4 / 6" chip, and what a screen reader says in its place.
    count?: { at: number, total: number, spoken: string },
    title: string,
    subtitle?: string
}

const CHIP = 30;

// The top of every board screen: the way out, where the table is, and what this screen is asking.
export default function PlayBand({ game, onClose, closeLabel, label, count, title, subtitle }: Props) {
    const styles = useStyles();
    const pop = usePressPop();

    // An accent is the same on both schemes, so the ink on top of it is fixed too.
    const ink = accentInkColor(game.accentInk);

    return (
        <AccentBand gradient={game.gradient} gutter={0} underHeader={false} style={styles.band}>
            <View style={styles.row}>
                <AnimatedPressable
                    onPress={onClose}
                    onPressIn={pop.onPressIn}
                    onPressOut={pop.onPressOut}
                    onHoverIn={pop.onHoverIn}
                    onHoverOut={pop.onHoverOut}
                    accessibilityRole='button'
                    accessibilityLabel={closeLabel}
                    style={[styles.leave, { backgroundColor: withAlpha(ink, 0.16) }, pop.animatedStyle]}
                >
                    <Feather name='arrow-left' size={15} color={ink} />
                </AnimatedPressable>

                <AppText style={[styles.label, { color: withAlpha(ink, 0.65) }]} numberOfLines={1}>{label}</AppText>

                {count !== undefined ? (
                    <View style={[styles.count, { backgroundColor: withAlpha(ink, 0.16) }]} accessible accessibilityLabel={count.spoken}>
                        <AppText style={[styles.countText, { color: ink }]}>{`${count.at} / ${count.total}`}</AppText>
                    </View>
                ) : (
                    // Holds the label on the centre line when there is no chip to balance the arrow.
                    <View style={styles.spacer} />
                )}
            </View>

            <View style={styles.heading} accessibilityRole='header'>
                <AppText style={[styles.title, { color: ink }]}>{title}</AppText>

                {subtitle !== undefined && <AppText style={[styles.subtitle, { color: withAlpha(ink, 0.72) }]}>{subtitle}</AppText>}
            </View>
        </AccentBand>
    )
}

const useStyles = createThemedStyles(() => ({
    band: {
        flexShrink: 0,
        paddingTop: 14,
        paddingBottom: 18,
        paddingHorizontal: Spacing.four,
        gap: 12
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    leave: {
        width: CHIP,
        height: CHIP,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999
    },
    label: {
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    count: {
        minWidth: CHIP,
        flexShrink: 0,
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 999
    },
    // Tabular, so the chip does not change width as the round ticks over.
    countText: {
        fontSize: 11,
        fontWeight: 900,
        fontVariant: ['tabular-nums']
    },
    spacer: {
        width: CHIP
    },
    heading: {
        gap: 5
    },
    title: {
        fontSize: 26,
        lineHeight: 26 * 1.05,
        fontWeight: 900,
        letterSpacing: -0.9
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 13 * 1.35,
        fontWeight: 700
    }
}))
