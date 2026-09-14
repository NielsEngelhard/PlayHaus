import AccentBand from "@/components/layout/AccentBand";
import AppText from "@/components/text/AppText";
import { FAKE_FILLER } from "@/constants/games";
import { accentInkColor, Spacing, withAlpha } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    onClose: () => void,
    closeLabel: string,
    label: string,
    // The "4 / 6" chip, and what a screen reader says in its place.
    count?: { at: number, total: number, spoken: string },
    title: string,
    subtitle?: string
}

// Mint on both schemes, so the ink on top of it is fixed too.
const INK = accentInkColor(FAKE_FILLER.accentInk);

const CHIP = 30;

// The top of every board screen: the way out, where the table is, and what this screen is asking.
export default function PlayBand({ onClose, closeLabel, label, count, title, subtitle }: Props) {
    const styles = useStyles();

    return (
        <AccentBand gradient={FAKE_FILLER.gradient} gutter={0} underHeader={false} style={styles.band}>
            <View style={styles.row}>
                <Pressable
                    onPress={onClose}
                    accessibilityRole='button'
                    accessibilityLabel={closeLabel}
                    style={styles.leave}
                >
                    <Feather name='arrow-left' size={15} color={INK} />
                </Pressable>

                <AppText style={styles.label} numberOfLines={1}>{label}</AppText>

                {count !== undefined ? (
                    <View style={styles.count} accessible accessibilityLabel={count.spoken}>
                        <AppText style={styles.countText}>{`${count.at} / ${count.total}`}</AppText>
                    </View>
                ) : (
                    // Holds the label on the centre line when there is no chip to balance the arrow.
                    <View style={styles.spacer} />
                )}
            </View>

            <View style={styles.heading} accessibilityRole='header'>
                <AppText style={styles.title}>{title}</AppText>

                {subtitle !== undefined && <AppText style={styles.subtitle}>{subtitle}</AppText>}
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
        borderRadius: 999,
        backgroundColor: withAlpha(INK, 0.16)
    },
    label: {
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: withAlpha(INK, 0.65)
    },
    count: {
        minWidth: CHIP,
        flexShrink: 0,
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: withAlpha(INK, 0.16)
    },
    // Tabular, so the chip does not change width as the round ticks over.
    countText: {
        fontSize: 11,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: INK
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
        letterSpacing: -0.9,
        color: INK
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 13 * 1.35,
        fontWeight: 700,
        color: withAlpha(INK, 0.72)
    }
}))
