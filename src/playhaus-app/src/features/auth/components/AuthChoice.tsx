import AppText from "@/components/text/AppText";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    onAccount: () => void
    onGuest: () => void
}

/**
 * The gate's first screen: the two ways into the app, stacked.
 *
 * Purely a fork — both buttons only switch the view. Guest used to sign you in
 * from here, back when there was nothing to ask a guest; it now leads to the
 * language step, which owns that request and its failure the same way the login
 * and signup forms own theirs.
 */
export default function AuthChoice({ onAccount, onGuest }: Props) {
    const styles = useStyles();

    return (
        <View>
            <AppText style={styles.title}>Welcome to Playhaus</AppText>

            <AppText style={styles.subtitle}>
                Sign in to keep your name, your friends and your games. Or jump
                straight in as a guest.
            </AppText>

            <View style={styles.buttons}>
                <TextButton
                    text='Account'
                    onPress={onAccount}
                    variant='primary'
                    fullWidth
                />

                {/* Muted on purpose: available, but not the road being recommended. */}
                <TextButton
                    text='As Guest'
                    onPress={onGuest}
                    variant='muted'
                    fullWidth
                />
            </View>

            <AppText style={styles.hint}>
                A guest account is temporary
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        color: theme.colors.text
    },
    subtitle: {
        marginTop: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textSecondary
    },
    buttons: {
        marginTop: Spacing.four,
        // The two sit under each other, not in a row: they are alternatives, and a
        // column gives each one a full-width tap target.
        flexDirection: 'column',
        gap: Spacing.three
    },
    hint: {
        marginTop: Spacing.four,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: theme.colors.textSecondary
    }
}))
