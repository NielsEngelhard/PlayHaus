import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { FontSizes, Spacing, type ButtonVariant } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

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
    const pop = usePressPop();

    const text = label ?? t('common.back');

    const { fill, label: ink } = theme.buttonVariants[variant];

    return (
        <Link href={href} asChild>
            <AnimatedPressable
                accessibilityRole='link'
                accessibilityLabel={text}
                onPressIn={pop.onPressIn}
                onPressOut={pop.onPressOut}
                onHoverIn={pop.onHoverIn}
                onHoverOut={pop.onHoverOut}
                // `style` comes last so a caller can trim the standing margin below without having to reach into this file for the rest of the look. Flattened to one object: `Link asChild` clones this onto the anchor it renders, and a style array does not survive that trip.
                style={StyleSheet.flatten([styles.button, { backgroundColor: fill }, style, pop.animatedStyle])}
            >
                <Feather name='arrow-left' size={18} color={ink} />
                <AppText style={[styles.text, { color: ink }]}>{text}</AppText>
            </AnimatedPressable>
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
