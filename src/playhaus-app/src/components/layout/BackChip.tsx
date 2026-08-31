import AppText from "@/components/text/AppText";
import { Brand, accentInkColor, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

interface Props {
    /** Where up is. Worked out by `Header` from the route, not by the page. */
    href: Href,
    /**
     * `chrome` is the standing square chip the app `Header` wears. `band` is the same
     * way out redrawn for an accent band: a translucent ink pill with the word "Back"
     * in it, because a band has no header conventions around it to say what a bare
     * square with an arrow is.
     */
    variant?: 'chrome' | 'band'
}

const SIZE = 36;

/**
 * The way back, at the left of whichever header the page has.
 *
 * A `Link` rather than a `Pressable` calling `router.back()`: this app ships to web too,
 * where the back control should be a real anchor you can middle-click, and where history
 * can hold pages that aren't ours.
 */
export default function BackChip({ href, variant = 'chrome' }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    /*
     * The band variant colours itself from the accent the page lent — a wash of ink
     * under whichever of the two inks the accent carries text in. The wash is heavy
     * under paper glyphs (they need a dark ground to stand on) and faint under ink ones
     * (ink on a pale accent only needs a hint of a shape). No accent means no band to
     * be on, so the chip falls back to its chrome self rather than guessing.
     */
    const accent = useAccent();
    const band = variant === 'band' && accent !== null;
    const bandGlyph = band ? accentInkColor(accent.ink) : theme.colors.text;
    const bandFill = band
        ? withAlpha(Brand.ink, accent.ink === 'paper' ? 0.22 : 0.08)
        : undefined;

    return (
        <Link href={href} asChild>
            <Pressable
                accessibilityRole='link'
                accessibilityLabel={t('common.back')}
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                // style array does not survive that trip.
                style={StyleSheet.flatten([
                    band ? styles.bandChip : styles.chip,
                    band && { backgroundColor: bandFill }
                ])}
            >
                <Feather name='arrow-left' size={band ? 16 : 17} color={bandGlyph} />

                {band && (
                    <AppText style={[styles.bandLabel, { color: bandGlyph }]}>
                        {t('common.back')}
                    </AppText>
                )}
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    chip: {
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    // No outline and no shadow: on a saturated band a wash is chrome enough, and a hard
    // edge would be the one outlined object left on it.
    bandChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        flexShrink: 0,
        paddingLeft: 10,
        paddingRight: 14,
        borderRadius: 999
    },
    bandLabel: {
        fontSize: 13,
        fontWeight: 800
    }
}))
