import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";

/**
 * Why the last attempt failed, said in one line above the submit button.
 *
 * Deliberately not `InlineNotification`: that one wraps itself in a `Card`, and
 * these already sit inside the gate's card.
 */
export default function AuthErrorText({ message }: { message: string }) {
    const styles = useStyles();

    return (
        <AppText accessibilityRole='alert' style={styles.message}>
            {message}
        </AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    message: {
        marginTop: Spacing.three,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 500,
        color: theme.colors.destructive
    }
}))
