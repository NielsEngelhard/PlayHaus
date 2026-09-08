import AppText from "@/components/text/AppText";
import { FontSizes, Spacing, type ButtonVariant } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    href: Href,
    label?: string,
    variant?: ButtonVariant,
    style?: StyleProp<ViewStyle>
}

// Walks back up one page.
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
                // `style` comes last so a caller can trim the standing margin below without having to reach into this file for the rest of the look.
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
        // A column parent stretches its children by default.
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
