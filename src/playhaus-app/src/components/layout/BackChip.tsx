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
    // Handled here instead, for a page whose "up" is somewhere inside itself.
    onPress?: () => void,
    // `chrome` is the standing square chip the app `Header` wears.
    variant?: 'chrome' | 'band'
}

const SIZE = 36;

// The way back, at the left of whichever header the page has.
export default function BackChip({ href, onPress, variant = 'chrome' }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    // The band variant colours itself from the accent the page lent.
    const accent = useAccent();
    const band = variant === 'band' && accent !== null;
    const bandGlyph = band ? accentInkColor(accent.ink) : theme.colors.text;
    const bandFill = band
        ? withAlpha(Brand.ink, accent.ink === 'paper' ? 0.22 : 0.08)
        : undefined;

    const chip = (
        <Pressable
            // A step back is a button and an anchor is a link.
            accessibilityRole={onPress === undefined ? 'link' : 'button'}
            accessibilityLabel={t('common.back')}
            onPress={onPress}
            // Flattened: `Link asChild` clones this onto the anchor it renders, and a style array does not survive that trip.
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
    );

    // Only wrapped when the way back really is another page.
    return onPress === undefined ? <Link href={href} asChild>{chip}</Link> : chip;
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
    // No outline and no shadow: on a saturated band a wash is chrome enough.
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
