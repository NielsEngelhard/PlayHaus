import AppText from "@/components/text/AppText";
import { FontSizes, Spacing, type ButtonVariant } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    /** Where the back link goes. */
    href: Href,
    label?: string,
    /**
     * Defaults to `secondary`, the accent fill `theme.solidButton` already carries. Pass
     * `neutral` where going back is not what the page is for and the accent would be
     * competing with the thing that is.
     */
    variant?: ButtonVariant,
    /** For layout only — how the button sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * Walks back up one page. Wears the same chrome as `TextButton`, with an arrow ahead of
 * the label.
 *
 * A `Link` rather than a `Pressable` with `router.back()`: this app ships to web too,
 * where the back link should be a real anchor you can middle-click, and where history
 * can hold pages that aren't ours.
 */
export default function BackButton({ href, label, variant = 'secondary', style }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const text = label ?? t('common.back');

    const { fill, label: ink } = theme.buttonVariants[variant];

    return (
        <Link href={href} asChild>
            <Pressable
                accessibilityRole='link'
                accessibilityLabel={text}
                // `style` comes last so a caller can trim the standing margin below
                // without having to reach into this file for the rest of the look.
                style={StyleSheet.flatten([styles.button, { backgroundColor: fill }, style])}
            >
                <Feather name='arrow-left' size={18} color={ink} />
                <AppText style={[styles.text, { color: ink }]}>{text}</AppText>
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    button: {
        ...theme.solidButton,
        // A column parent stretches its children by default, so sizing to the label
        // means opting out of that rather than doing nothing.
        alignSelf: 'flex-start',
        flexShrink: 0,
        flexDirection: 'row',
        gap: Spacing.two,
        marginVertical: Spacing.four
    },
    text: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        textTransform: 'uppercase'
    }
}))
