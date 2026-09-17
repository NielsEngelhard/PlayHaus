import AppText from "@/components/text/AppText";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

/** What the round did to this viewer: the two answers a truth makes possible, and the one a mode without a truth leaves. */
export type Verdict = 'miss' | 'hit' | 'picked';

interface Props {
    verdict: Verdict,
    title: string,
    reason: string,
    /** What the round paid this viewer. Absent in the mode where a vote pays nobody but the author. */
    points?: string
}

const TILE_SIZE = 44;
const TILE_RADIUS = 14;

// The one saturated thing on the reveal: what this viewer's vote was worth, loud enough to read across a table.
export default function RoundVerdict({ verdict, title, reason, points }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const miss = verdict === 'miss';
    // Paper clears 4.5:1 on the red where ink does not; the mint carries ink in both schemes.
    const ink = miss ? theme.colors.textOnAccent : Brand.ink;

    return (
        <View style={[styles.strip, miss ? styles.stripMiss : styles.stripHit]}>
            <View style={styles.tile}>
                <Feather
                    name={miss ? 'x' : 'check'}
                    size={24}
                    color={miss ? theme.colors.destructive : theme.colors.available}
                />
            </View>

            <View style={styles.body}>
                <AppText style={[styles.title, { color: ink }]}>{title}</AppText>

                <AppText style={[styles.reason, { color: ink }]} numberOfLines={2}>{reason}</AppText>
            </View>

            {points !== undefined && (
                <View style={styles.points}>
                    <AppText style={styles.pointsText}>{points}</AppText>
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Never grows with the cards below it: the strip is a headline, not a surface.
    strip: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 13,
        paddingHorizontal: 15,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        ...theme.shadows.hard
    },
    stripMiss: {
        backgroundColor: theme.colors.destructive
    },
    stripHit: {
        backgroundColor: theme.colors.mint
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: TILE_RADIUS,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.backgroundSecondary
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: 22,
        lineHeight: 23,
        fontWeight: 900,
        letterSpacing: -0.7
    },
    reason: {
        marginTop: Spacing.half,
        fontSize: 12.5,
        lineHeight: 16,
        fontWeight: 800
    },
    points: {
        flexShrink: 0,
        paddingVertical: 5,
        paddingHorizontal: 11,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.backgroundSecondary
    },
    pointsText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    }
}))
