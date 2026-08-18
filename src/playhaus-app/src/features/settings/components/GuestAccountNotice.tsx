import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { useTheme } from "@/features/theme/ThemeContext";

interface Props {
    onCreateAccount: () => void
}

// Out here rather than inline: a JSX attribute keeps every newline and every space
// of indentation it is written with, which a wrapped sentence would then carry
// onto the screen.
const MESSAGE = 'Je speelt als gast. Dit account is tijdelijk: je naam, kleur en '
    + 'gespeelde games kunnen verloren gaan zodra deze sessie eindigt. Maak een '
    + 'account aan om ze te bewaren.';

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

    return (
        <InlineNotification
            title='Gastaccount'
            icon='alert-triangle'
            color={theme.colors.destructive}
            iconColor={theme.colors.textOnAccent}
            message={MESSAGE}
        >
            <TextButton
                text='Account aanmaken'
                onPress={onCreateAccount}
                variant='primary'
            />
        </InlineNotification>
    )
}
