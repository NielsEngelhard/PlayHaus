import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { avatarColorById } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

interface Props {
    /** Who is playing. On a solo board that is always the account that owns the game. */
    name: string,
    /** Which swatch in `AVATAR_COLORS`, not a colour — same as on `User`. */
    avatarColorId: string,
    /** The running total across every round of this game, not the round on screen. Left out on a zen game, which keeps no score. */
    score?: number,
    /** ISO timestamp, straight off `Game.createdAt`. Where the clock counts from. Left out on a zen game, which runs no clock. */
    startedAt?: string,
    // Whether the clock is still running.
    running?: boolean,
    /** For layout only — how the row sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

// Who is playing, how they are doing and how long they have been at it. Both halves are optional, which is what zen mode is.
export default function SoloStatusRow({ name, avatarColorId, score, startedAt, running = true, style }: Props) {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    const avatar = avatarColorById(avatarColorId);
    const elapsed = useElapsed(startedAt ?? '', running && startedAt !== undefined);

    return (
        <View style={[styles.row, style]}>
            <View
                style={styles.chip}
                accessibilityRole='text'
                accessibilityLabel={score === undefined ? name : t('lol.game.scoreLabel', { name, score })}
            >
                {/* The player's own colour, the same swatch their chip wears at a table. */}
                <View style={[styles.dot, { backgroundColor: avatar.color }]} />

                <AppText style={styles.name} numberOfLines={1}>{name}</AppText>

                {score !== undefined && (
                    <AppText style={styles.score}>{score}</AppText>
                )}
            </View>

            {startedAt !== undefined && (
                <View
                    style={styles.clock}
                    accessibilityRole='text'
                    accessibilityLabel={t('lol.game.playTimeLabel', { time: formatted(elapsed) })}
                >
                    <Feather name='clock' size={14} color={theme.colors.textSecondary} />

                    <AppText style={styles.time}>{formatted(elapsed)}</AppText>
                </View>
            )}
        </View>
    )
}

// How long the game has been going, ticking once a second.
function useElapsed(startedAt: string, running: boolean): number {
    const [elapsed, setElapsed] = useState(() => elapsedMs(startedAt));

    // Re-read during render rather than from an effect.
    const [counting, setCounting] = useState(`${startedAt}:${running}`);
    if (counting !== `${startedAt}:${running}`) {
        setCounting(`${startedAt}:${running}`);
        setElapsed(elapsedMs(startedAt));
    }

    useEffect(() => {
        if (!running) return;

        const tick = setInterval(() => setElapsed(elapsedMs(startedAt)), 1000);
        return () => clearInterval(tick);
    }, [startedAt, running]);

    return elapsed;
}

function elapsedMs(startedAt: string): number {
    const started = Date.parse(startedAt);

    // A server old enough not to send `createdAt` leaves this NaN.
    if (Number.isNaN(started)) return 0;

    return Math.max(0, Date.now() - started);
}

// `m:ss`, and `h:mm:ss` once there is an hour to show.
function formatted(milliseconds: number): string {
    const total = Math.floor(milliseconds / 1000);
    const seconds = (total % 60).toString().padStart(2, '0');
    const minutes = Math.floor(total / 60) % 60;
    const hours = Math.floor(total / 3600);

    return hours === 0
        ? `${minutes}:${seconds}`
        : `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        // Room for the hard shadow under the chip, which sits outside its own box.
        paddingBottom: Spacing.half + 2
    },
    // `PlayerScoreRow`'s chip, standing on its own.
    chip: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        maxWidth: 220,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: theme.colors.background,
        ...theme.shadows.hard
    },
    dot: {
        width: 12,
        height: 12,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border
    },
    name: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.text
    },
    score: {
        flexShrink: 0,
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.text
    },
    // Bare, on the other end of the row.
    clock: {
        marginLeft: 'auto',
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },
    time: {
        fontSize: FontSizes.sm,
        fontWeight: 800,
        // Digits change every second; without this the row twitches as they do.
        fontVariant: ['tabular-nums'],
        color: theme.colors.textSecondary
    }
}))
