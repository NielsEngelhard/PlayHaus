import { useTopTone } from "@/components/layout/PageToneContext";
import { ContentWidth, HeaderHeight, linearGradient, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { Platform, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// How far the fill runs up past the page's top, for a pull-down to reveal.
const OVERSCROLL_REACH = 1000;

interface Props {
    children: ReactNode,
    // Hard against whatever sits above it, such as an `InGameHeader`: no reach up behind a header and no notch padding.
    flush?: boolean,
    // The three stops the band is filled with, lightest first — `game.gradient`.
    gradient: readonly [string, string, string],
    // The side padding of the parent that the band reaches back out into: `Spacing.four` under `Chrome`, 0 on a chromeless page.
    gutter?: number,
    // How far the fill runs on past the band's bottom edge, behind whatever follows it.
    overlap?: number,
    // Padding and gap for the contents; the sides default to `gutter`, the bottom to `Spacing.four`.
    style?: StyleProp<ViewStyle>,
    // Up behind the app header, or down past the notch on a page that has no header.
    underHeader?: boolean
}

// A gradient band behind the top of a page, out to the window's edges.
export default function AccentBand({ children, flush = false, gradient, gutter = Spacing.four, overlap = 0, style, underHeader = true }: Props) {
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();

    // The first stop is the corner of the 160° gradient that meets the status bar.
    useTopTone(flush ? null : gradient[0]);

    // How far past the column the fill has to reach to make the window, and so also whether it is reaching at all.
    // The outer View's own `-gutter` margin already cancels the parent's gutter padding, so `gutter` plays no part here.
    const bleed = Platform.OS === 'web'
        ? Math.max(0, Math.ceil((windowWidth - ContentWidth) / 2))
        : 0;

    return (
        <View
            style={[
                { marginHorizontal: -gutter },
                !flush && (underHeader
                    ? { marginTop: -HeaderHeight, paddingTop: HeaderHeight }
                    : { paddingTop: insets.top })
            ]}
        >
            {/* Its own view rather than a taller slab, which would stretch the gradient out of sight. */}
            {!flush && (
                <View
                    pointerEvents="none"
                    style={[styles.overscroll, { left: -bleed, right: -bleed, backgroundColor: gradient[0] }]}
                />
            )}

            {/* Drawn first so everything after it lands on top. */}
            <View
                pointerEvents="none"
                style={[
                    styles.slab,
                    // Square once it runs off the sides of the window: a corner rounded against an edge it never touches reads as a mistake.
                    bleed > 0 && styles.slabWide,
                    // Not up past its own top edge, where it would paint over the line the thing above it ends on.
                    flush && styles.slabFlush,
                    { bottom: -overlap, left: -bleed, right: -bleed },
                    linearGradient(gradient)
                ]}
            />

            <View style={[{ paddingHorizontal: gutter }, styles.content, style]}>
                {children}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    slab: {
        position: 'absolute',
        top: -Spacing.six,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Light cuts the band off with the same hard line every card wears.
        borderBottomWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderBottomColor: theme.colors.border
    },

    overscroll: {
        position: 'absolute',
        top: -OVERSCROLL_REACH,
        height: OVERSCROLL_REACH - Spacing.six + 1
    },

    slabFlush: {
        top: 0
    },

    slabWide: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0
    },

    content: {
        paddingBottom: Spacing.four
    }
}))
