import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

interface Props {
    /** ISO deadline, straight off `GameRound.endsAt`. */
    endsAt: string,
    /** For layout only — how the timer sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/** Below this the clock turns loud, because it is now the thing to worry about. */
const HURRY_MS = 30_000;

const remainingMs = (endsAt: string) => Math.max(0, Date.parse(endsAt) - Date.now());

function formatted(milliseconds: number): string {
    const total = Math.ceil(milliseconds / 1000);
    const seconds = total % 60;

    return `${Math.floor(total / 60)}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * The countdown on a multiplayer round. Solo games have no clock at all, so this is
 * never rendered for them.
 *
 * It counts down against the server's deadline rather than from a duration, so a phone
 * that slept through half the round comes back showing the right number instead of one
 * that is thirty seconds behind everybody else's.
 */
export default function GameTimer({ endsAt, style }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const [remaining, setRemaining] = useState(() => remainingMs(endsAt));

    // Re-read during render rather than from an effect: a new deadline has to show the
    // right number in the same paint, and an effect would leave the old one up until the
    // next tick. This is React's "adjusting state when a prop changes" pattern.
    const [deadline, setDeadline] = useState(endsAt);
    if (deadline !== endsAt) {
        setDeadline(endsAt);
        setRemaining(remainingMs(endsAt));
    }

    useEffect(() => {
        const tick = setInterval(() => setRemaining(remainingMs(endsAt)), 1000);
        return () => clearInterval(tick);
    }, [endsAt]);

    const hurry = remaining <= HURRY_MS;

    return (
        <View style={[styles.row, style]}>
            <Feather
                name='clock'
                size={14}
                color={hurry ? theme.colors.destructive : theme.colors.textSecondary}
            />

            <AppText style={styles.label}>{t('lol.game.timeLeft')}</AppText>

            <AppText style={[styles.time, hurry && styles.timeHurry]}>
                {formatted(remaining)}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    label: {
        flex: 1,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    time: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        // Digits change every second; without this the whole row twitches as they do.
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },
    timeHurry: {
        color: theme.colors.destructive
    }
}))
