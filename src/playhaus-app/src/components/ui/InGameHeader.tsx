import AppText from "@/components/text/AppText";
import { accentOf, gameForPathname } from "@/constants/games";
import { accentInkColor, Brand, ContentWidth, Spacing, withAlpha, type Accent, type Theme } from "@/constants/theme";
import { AccentProvider, useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { getReach } from "@/utils/size-utils";
import Feather from "@expo/vector-icons/Feather";
import { usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** How one step of the track has gone, or that it has not been played yet. */
export type SegmentState = 'won' | 'lost' | 'played' | 'upcoming';

interface Props {
    onClose: () => void
    /** What the leave button is called, for anyone who cannot see the arrow. */
    closeLabel: string
    /** "Round 2 of 3", which used to be the top line of a card of its own. */
    label: string
    // One entry per step of whatever this game counts in.
    segments?: SegmentState[]
    // The right-hand slot: whatever chip the game wants there, and none of this one's business.
    children?: ReactNode
    // The far-right cluster: the chrome the app's header would have carried, on the board's own band.
    actions?: ReactNode
}

// The top of every board: the way out, where you are, and the game's own colour.
export default function InGameHeader({ onClose, closeLabel, label, segments, children, actions }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const pathname = usePathname();

    // Whose colour this is.
    const lent = useAccent();
    const game = gameForPathname(pathname);
    const accent: Accent | null = lent ?? (game === null ? null : accentOf(game));

    const fill = accent?.color ?? theme.colors.backgroundSecondary;
    const ink = accent === null ? theme.colors.text : accentInkColor(accent.ink);

    const { width: windowWidth } = useWindowDimensions();
    const reach = getReach(windowWidth)

    // The app's header used to hold the notch open. Nothing does now but this band.
    const insets = useSafeAreaInsets();

    const band = (
        <View
            style={[
                styles.band,
                {
                    backgroundColor: fill,
                    paddingTop: insets.top + BAND_PADDING,
                    marginHorizontal: -reach,
                    paddingHorizontal: reach + GUTTER
                }
            ]}
        >
            <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={styles.leave}
            >
                <Feather name="arrow-left" size={16} color={Brand.ink} />
            </Pressable>

            <View style={styles.body}>
                <AppText style={[styles.label, { color: withAlpha(ink, 0.85) }]} numberOfLines={1}>
                    {label}
                </AppText>

                {segments !== undefined && segments.length > 0 && (
                    <View style={[styles.track, segments.length > CROWDED && styles.trackTight]}>
                        {segments.map((state, index) => (
                            <View
                                key={index}
                                style={[styles.segment, { backgroundColor: segmentFill(state, ink, theme) }]}
                            />
                        ))}
                    </View>
                )}
            </View>

            {children}

            {actions !== undefined && <View style={styles.actions}>{actions}</View>}
        </View>
    );

    // The colour is lent onward as well as painted.
    return accent === null ? band : <AccentProvider accent={accent}>{band}</AccentProvider>;
}

/** The band's own vertical padding, which the notch is then added on top of. */
const BAND_PADDING = 11;

// The gutter kept between the band's contents and the column's edge, once the fill has bled past it.
const GUTTER = Spacing.four;

// How wide the band already is before it reaches out.
const COLUMN_WIDTH = ContentWidth + Spacing.four * 2;

/** Past this many steps the track closes up, so the gaps stop eating the segments. */
const CROWDED = 6;

// What one segment looks like on an accent band.
function segmentFill(state: SegmentState, ink: string, theme: Theme): string {
    switch (state) {
        case 'won':
            return theme.colors.mint;
        case 'lost':
            return theme.colors.blush;
        case 'played':
            return theme.colors.lemon;
        default:
            return withAlpha(ink, 0.32);
    }
}

const useStyles = createThemedStyles(theme => ({
    // Square, and hard against the board below it.
    band: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        // Only the bottom half.
        paddingBottom: BAND_PADDING,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    // A paper chip in every scheme and on every accent, so its glyph is ink in every scheme and on every accent.
    leave: {
        width: 34,
        height: 34,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: withAlpha(Brand.textOnAccent, 0.92),
        ...theme.shadows.hardSmall
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    // Tighter than the row's own gap: these belong to each other rather than to the row.
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: Spacing.one
    },
    label: {
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.6
    },
    track: {
        marginTop: 5,
        flexDirection: 'row',
        gap: Spacing.one
    },
    trackTight: {
        gap: 3
    },
    segment: {
        flex: 1,
        height: 5,
        borderRadius: 999
    }
}))
