import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    onUpgrade: () => void
}

/**
 * What a guest sees at the top of their profile: that this account is temporary,
 * and the one button that fixes it.
 *
 * It used to open a signup sheet, which made a brand new account and left the guest's
 * games behind — so the notice was warning about a thing its own button caused. It
 * now leads to the upgrade page, which keeps them.
 *
 * `destructive` rather than the default `lemon` — this is a warning about
 * something that can go wrong, and the pale `blush` it used to wear read as
 * decoration rather than as a warning. It stays an `InlineNotification` all the
 * same: nothing is broken yet, and the page underneath is perfectly usable.
 */
export default function GuestAccountNotice({ onUpgrade }: Props) {
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
                onPress={onUpgrade}
                variant='primary'
            />
        </InlineNotification>
    )
}
