import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

interface Props {
    /** Where up is. Worked out by `Header` from the route, not by the page. */
    href: Href
}

const SIZE = 36;

/**
 * The way back, as a square chip at the left of the header.
 *
 * A `Link` rather than a `Pressable` calling `router.back()`: this app ships to web too,
 * where the back control should be a real anchor you can middle-click, and where history
 * can hold pages that aren't ours.
 */
export default function BackChip({ href }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <Link href={href} asChild>
            <Pressable
                accessibilityRole='link'
                accessibilityLabel={t('common.back')}
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                // style array does not survive that trip.
                style={StyleSheet.flatten([styles.chip])}
            >
                <Feather name='arrow-left' size={17} color={theme.colors.text} />
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
    }
}))
