import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { StyleSheet } from "react-native";

/**
 * Why the last attempt failed, said in one line above the submit button.
 *
 * Deliberately not `InlineNotification`: that one wraps itself in a `Card`, and
 * these already sit inside the gate's card.
 */
export default function AuthErrorText({ message }: { message: string }) {
    return (
        <AppText accessibilityRole='alert' style={styles.message}>
            {message}
        </AppText>
    )
}

const styles = StyleSheet.create({
    message: {
        marginTop: Spacing.three,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 500,
        color: Colors.light.destructive
    }
})
