import AppText from "@/components/text/AppText";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { useCooldown } from "@/hooks/useCooldown";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { copyText } from "@/utils/share";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";

interface Props {
    /** The code that got this player in here. */
    code: string
}

/** How long the tick stays up after a copy. Long enough to notice, short enough to forget. */
const CONFIRMED_MS = 1600;

// The code, at the bottom of a guest's screen, small and quiet.
export default function RoomCodeFooter({ code }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [confirmed, confirm] = useCooldown(CONFIRMED_MS);
    const pop = usePressPop();

    async function copy() {
        // Only a real copy is worth confirming.
        if (await copyText(code) === 'copied') confirm();
    }

    return (
        <AnimatedPressable
            onPress={() => void copy()}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole='button'
            accessibilityLabel={t('lobby.copyCode', { characters: [...code].join(' ') })}
            style={[styles.footer, pop.animatedStyle]}
        >
            <AppText style={styles.label}>{confirmed ? t('lobby.copied') : t('lobby.code')}</AppText>

            <AppText style={styles.code}>{code}</AppText>

            <Feather
                name={confirmed ? 'check' : 'copy'}
                size={15}
                color={confirmed ? theme.colors.available : theme.colors.textMuted}
            />
        </AnimatedPressable>
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
        // Lemon on the dark canvas, the way the host's tiles are: it is the one thing in this frame worth reading.
        color: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text
    }
}))
