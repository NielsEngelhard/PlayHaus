import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    title: string
    onBack: () => void
    /** Set while a request is in flight, so nobody navigates out from under it. */
    disabled?: boolean
}

/**
 * Title row for a form inside the auth gate, with the way back to the three
 * choices.
 *
 * Not the shared `BackButton`: that one is a `Link` to a route, and these steps
 * are views inside a modal that has no route of its own.
 */
export default function AuthFormHeader({ title, onBack, disabled = false }: Props) {
    return (
        <View style={styles.row}>
            <Pressable
                onPress={onBack}
                disabled={disabled}
                accessibilityRole='button'
                accessibilityLabel='Back'
                style={[styles.backButton, disabled && styles.disabled]}
            >
                <Feather name='arrow-left' size={18} color={Colors.light.text} />
            </Pressable>

            <AppText style={styles.title}>{title}</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    backButton: {
        width: 38,
        height: 38,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 12,
        backgroundColor: Colors.light.backgroundSecondary,
        ...Shadows.hardSmall
    },
    disabled: {
        opacity: 0.5
    },
    title: {
        // Without this a long title pushes the arrow off the card instead of wrapping.
        flex: 1,
        fontSize: FontSizes.xl,
        fontWeight: 900
    }
})
