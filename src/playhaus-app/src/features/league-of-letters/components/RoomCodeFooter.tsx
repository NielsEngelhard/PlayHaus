import AppText from "@/components/text/AppText";
import { useCooldown } from "@/hooks/useCooldown";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { copyText } from "@/utils/share";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable } from "react-native";

interface Props {
    /** The code that got this player in here. */
    code: string
}

/** How long the tick stays up after a copy. Long enough to notice, short enough to forget. */
const CONFIRMED_MS = 1600;

/**
 * The code, at the bottom of a guest's screen, small and quiet.
 *
 * A guest already used this code to get in, so it is not news — it is there for the one
 * thing they might still want it for: passing it on to somebody sitting next to them.
 * Hence the dashed frame, which is the app's shape for something waiting to be used
 * rather than something that has happened.
 */
export default function RoomCodeFooter({ code }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [confirmed, confirm] = useCooldown(CONFIRMED_MS);

    async function copy() {
        // Only a real copy is worth confirming. On a phone this opens the share sheet
        // instead — the platform has already said what happened, far louder than a tick.
        if (await copyText(code) === 'copied') confirm();
    }

    return (
        <Pressable
            onPress={() => void copy()}
            accessibilityRole='button'
            accessibilityLabel={t('lobby.copyCode', { characters: [...code].join(' ') })}
            style={styles.footer}
        >
            <AppText style={styles.label}>{confirmed ? t('lobby.copied') : t('lobby.code')}</AppText>

            <AppText style={styles.code}>{code}</AppText>

            <Feather
                name={confirmed ? 'check' : 'copy'}
                size={15}
                color={confirmed ? theme.colors.available : theme.colors.textMuted}
            />
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    footer: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 13,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.scheme === 'dark'
            ? 'rgba(23, 23, 31, 0.55)'
            : 'rgba(255, 255, 255, 0.5)'
    },
    label: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    code: {
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: 2,
        // Lemon on the dark canvas, the way the host's tiles are: it is the one thing in
        // this frame worth reading.
        color: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text
    }
}))
