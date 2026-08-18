import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    onLogin: () => void
    onCreateAccount: () => void
    onBack: () => void
}

/**
 * The gate's second screen, once "Account" has been picked: login or signup.
 *
 * Purely a fork — both buttons only switch the view, and neither talks to the
 * server — so unlike the screen before it this one has no busy or error state
 * of its own.
 */
export default function AccountChoice({ onLogin, onCreateAccount, onBack }: Props) {
    const styles = useStyles();

    return (
        <View>
            <AuthFormHeader title='Account' onBack={onBack} />

            <AppText style={styles.subtitle}>
                Login if you already have an account, or sign up to make one.
            </AppText>

            <View style={styles.buttons}>
                <TextButton
                    text='Login'
                    onPress={onLogin}
                    variant='secondary'
                    fullWidth
                />

                <TextButton
                    text='Sign Up'
                    onPress={onCreateAccount}
                    variant='primary'
                    fullWidth
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    subtitle: {
        marginTop: Spacing.four,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textSecondary
    },
    buttons: {
        marginTop: Spacing.four,
        flexDirection: 'column',
        gap: Spacing.three
    }
}))
