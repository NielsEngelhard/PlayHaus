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
    /** The running total across every round of this game, not the round on screen. */
    score: number,
    /** ISO timestamp, straight off `Game.createdAt`. Where the clock counts from. */
    startedAt: string,
    /**
     * Whether the clock is still running. Goes false when the game is over, and the
     * number then stands as how long the whole game took rather than as how long the
     * player has been looking at the result.
     */
    running?: boolean,
    /** For layout only — how the row sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * Who is playing, how they are doing and how long they have been at it — the solo board's
 * answer to the row of chips a multiplayer one puts above the grid.
 *
 * The chip is deliberately the same chip: on a shared board `PlayerScoreRow` draws a dot,
 * a name and a running total in exactly this shape, and a solo game is really a
 * multiplayer one with nobody else in it. Making it look like a different kind of readout
 * would say the two modes score differently, which they do not.
 *
 * The clock is the one thing solo has that multiplayer does not, and it counts the
 * opposite way round. A multiplayer round runs against a deadline the server set, so
 * `GameTimer` counts down to it; solo has no deadline at all, so all there is to say is
 * how long this has been going on. That also means it is a client timer in a way the
 * countdown is not — nothing about the game depends on it, and nothing on the server ever
 * reads it back.
 */
export default function SoloStatusRow({ name, avatarColorId, score, startedAt, running = true, style }: Props) {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    const avatar = avatarColorById(avatarColorId);
    const elapsed = useElapsed(startedAt, running);

    return (
        <View style={[styles.row, style]}>
            <View
                style={styles.chip}
                accessibilityRole='text'
                accessibilityLabel={t('lol.game.scoreLabel', { name, score })}
            >
                {/* The player's own colour, the same swatch their chip wears at a table.
                    No ring around it: a presence light on a board with one player on it
                    would be reporting on whether you are here. */}
                <View style={[styles.dot, { backgroundColor: avatar.color }]} />

                <AppText style={styles.name} numberOfLines={1}>{name}</AppText>

                <AppText style={styles.score}>{score}</AppText>
            </View>

            <View
                style={styles.clock}
                accessibilityRole='text'
                accessibilityLabel={t('lol.game.playTimeLabel', { time: formatted(elapsed) })}
            >
                <Feather name='clock' size={14} color={theme.colors.textSecondary} />

                <AppText style={styles.time}>{formatted(elapsed)}</AppText>
            </View>
        </View>
    )
}

/**
 * How long the game has been going, ticking once a second.
 *
 * Measured against the start rather than counted up from zero, for the same reason
 * `GameTimer` measures against its deadline: a phone that slept for ten minutes comes back
 * showing the ten minutes, where a counter that only moves while there are frames to move
 * on would have quietly stopped.
 *
 * Clamped at zero, because the start is the server's clock and the now is the phone's. A
 * few seconds of skew the wrong way is common and a game that has been running for minus
 * three seconds is not a thing to show anybody.
 */
function useElapsed(startedAt: string, running: boolean): number {
    const [elapsed, setElapsed] = useState(() => elapsedMs(startedAt));

    // Re-read during render rather than from an effect, so a game that has just ended
    // freezes on its true final time instead of on whatever the last tick happened to
    // catch — and so a board handed a different game shows its clock in the same paint.
    // React's "adjusting state when a prop changes" pattern, as in `GameTimer`.
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

    // A server old enough not to send `createdAt` leaves this NaN, and NaN survives every
    // sum and division below it to reach the screen as "NaN:NaN". There is no play time to
    // show against a game with no start, so the clock shows none rather than nonsense.
    if (Number.isNaN(started)) return 0;

    return Math.max(0, Date.now() - started);
}

/**
 * `m:ss`, and `h:mm:ss` once there is an hour to show.
 *
 * Floored rather than rounded up: this is time that has passed, and a clock reading 0:01
 * before the first second is out would be claiming a second that has not happened. The
 * countdown rounds the other way for the mirror-image reason.
 */
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
    // `PlayerScoreRow`'s chip, standing on its own: the same dot, name and total, and the
    // proud version of it — a solo board's one player is always "you".
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
    // Bare, on the other end of the row. No chip around it: the score is a fact about the
    // game and this is a fact about the sitting, and a second bordered pill would put the
    // two on the same footing.
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
