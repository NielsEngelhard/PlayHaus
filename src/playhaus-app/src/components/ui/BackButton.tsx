import AppText from "@/components/text/AppText";
import { Colors, FontSizes, SolidButton, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

interface Props {
    /** Where the back link goes. */
    href: Href,
    label?: string
}

/**
 * Walks back up one page. Wears the same chrome as `TextButton`, with an arrow ahead of
 * the label.
 *
 * A `Link` rather than a `Pressable` with `router.back()`: this app ships to web too,
 * where the back link should be a real anchor you can middle-click, and where history
 * can hold pages that aren't ours.
 */
export default function BackButton({ href, label = 'Terug' }: Props) {
    return (
        <Link href={href} asChild>
            <Pressable
                accessibilityRole='link'
                accessibilityLabel={label}
                style={styles.button}
            >
                <Feather name='arrow-left' size={18} color={Colors.light.textOnAccent} />
                <AppText style={styles.text}>{label}</AppText>
            </Pressable>
        </Link>
    )
}

const styles = StyleSheet.create({
    button: {
        ...SolidButton,
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
        textTransform: 'uppercase',
        color: Colors.light.textOnAccent
    }
})
