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
 * `blush` rather than the default `lemon` — this is a warning about something
 * that can go wrong, not a note about how the page works — but it stays an
 * `InlineNotification` rather than becoming a red alarm. Nothing is broken yet,
 * and the page underneath is perfectly usable as it is.
 */
export default function GuestAccountNotice({ onCreateAccount }: Props) {
    const theme = useTheme();

    return (
        <InlineNotification
            title='Gastaccount'
            icon='alert-triangle'
            color={theme.colors.blush}
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
