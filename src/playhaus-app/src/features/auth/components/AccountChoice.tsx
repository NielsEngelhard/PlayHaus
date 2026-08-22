import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import AuthFormHeader from "@/features/auth/components/AuthFormHeader";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
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
    const t = useT();

    return (
        <View>
            <AuthFormHeader title={t('auth.account.title')} onBack={onBack} />

            <AppText style={styles.subtitle}>
                {t('auth.account.description')}
            </AppText>

            <View style={styles.buttons}>
                <TextButton
                    text={t('auth.account.login')}
                    onPress={onLogin}
                    variant='secondary'
                    fullWidth
                />

                <TextButton
                    text={t('auth.account.signup')}
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
