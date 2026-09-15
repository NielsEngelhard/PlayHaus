import AccentBand from "@/components/layout/AccentBand";
import AppText from "@/components/text/AppText";
import { accentOf, gameForPathname } from "@/constants/games";
import { accentInkColor, Brand, Spacing, withAlpha, type Accent, type Theme } from "@/constants/theme";
import { AccentProvider, useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

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
    // The screen's headline, on the band under the row.
    title?: string
    subtitle?: string
    // Whatever else the screen puts on the band, under the title.
    hero?: ReactNode
    // How far the fill runs on behind whatever follows the band.
    overlap?: number
}

// The top of every board: the way out, where you are, and the game's own colour.
export default function InGameHeader({ onClose, closeLabel, label, segments, children, actions, title, subtitle, hero, overlap = Spacing.five }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const pathname = usePathname();

    // Whose colour this is.
    const lent = useAccent();
    const game = gameForPathname(pathname);
    const accent: Accent | null = lent ?? (game === null ? null : accentOf(game));

    const fill = theme.colors.backgroundSecondary;
    const gradient = accent?.gradient ?? [fill, fill, fill] as const;
    const ink = accent === null ? theme.colors.text : accentInkColor(accent.ink);

    // Chromeless boards have no app header, so the band clears the notch itself.
    const band = (
        <AccentBand gradient={gradient} overlap={overlap} underHeader={false} style={styles.band}>
            <View style={styles.row}>
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

            {(title !== undefined || subtitle !== undefined) && (
                <View style={styles.heading} accessibilityRole="header">
                    {title !== undefined && <AppText style={[styles.title, { color: ink }]}>{title}</AppText>}

                    {subtitle !== undefined && (
                        <AppText style={[styles.subtitle, { color: withAlpha(ink, 0.72) }]}>{subtitle}</AppText>
                    )}
                </View>
            )}

            {hero}
        </AccentBand>
    );

    // The colour is lent onward as well as painted.
    return accent === null ? band : <AccentProvider accent={accent}>{band}</AccentProvider>;
}

/** The band's top padding, which the notch is then added on top of. */
const BAND_PADDING = 11;

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
    band: {
        paddingTop: BAND_PADDING,
        gap: 14
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
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
