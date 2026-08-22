import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    onCreateAccount: () => void
}

/**
 * What a guest sees at the top of their profile: that this account is temporary,
 * and the one button that fixes it.
 *
 * `destructive` rather than the default `lemon` — this is a warning about
 * something that can go wrong, and the pale `blush` it used to wear read as
 * decoration rather than as a warning. It stays an `InlineNotification` all the
 * same: nothing is broken yet, and the page underneath is perfectly usable.
 */
export default function GuestAccountNotice({ onCreateAccount }: Props) {
    const theme = useTheme();
    const t = useT();

    return (
        <InlineNotification
            title={t('profile.guest.title')}
            icon='alert-triangle'
            color={theme.colors.destructive}
            iconColor={theme.colors.textOnAccent}
            message={t('profile.guest.message')}
        >
            <TextButton
                text={t('profile.guest.action')}
                onPress={onCreateAccount}
                variant='primary'
            />
        </InlineNotification>
    )
}
