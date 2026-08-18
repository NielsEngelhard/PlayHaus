import type { GamePlayer } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { ScrollView, StyleProp, View, ViewStyle } from "react-native";

interface Props {
    players: GamePlayer[],
    /** Whose row this is, so one chip can read `Jij` instead of a name. */
    userId: string,
    /**
     * Who is connected right now. A player not in here has their light out, which on
     * a turn-based board is the difference between waiting on somebody who is looking
     * at the screen and waiting on somebody whose phone locked.
     *
     * Left out on solo, where there is nobody to be connected.
     */
    online?: Set<string>,
    /** Whose turn it is, so the chip can say the board is waiting on them. */
    turnUserId?: string,
    /** Who is mid-word, if anybody. */
    typingUserId?: string,
    /** For layout only — how the row sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * Who else is playing and how they're doing, as a row of chips above the board.
 *
 * A chip rather than a table row: the board is the screen and this has to stay out of
 * its way. It scrolls sideways, so a full room never squeezes the grid.
 */
export default function PlayerScoreRow({ players, userId, online, turnUserId, typingUserId, style }: Props) {
    const styles = useStyles();

    // The server orders players by when they joined; a scoreboard wants the leader first.
    const ranked = [...players].sort((a, b) => b.score - a.score);

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.scroll, style]}
            contentContainerStyle={styles.row}
        >
            {ranked.map(player => (
                <PlayerChip
                    key={player.userId}
                    player={player}
                    you={player.userId === userId}
                    // Undefined means nobody is tracking presence — a solo board — and
                    // is not the same as "offline", which would put every light out.
                    live={online === undefined ? undefined : online.has(player.userId)}
                    up={player.userId === turnUserId}
                    typing={player.userId === typingUserId}
                />
            ))}
        </ScrollView>
    )
}

interface PlayerChipProps {
    player: GamePlayer,
    you: boolean,
    live?: boolean,
    up: boolean,
    typing: boolean
}

function PlayerChip({ player, you, live, up, typing }: PlayerChipProps) {
    const styles = useStyles();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.chip, you && styles.chipYou, up && styles.chipUp]}>
            {/*
              * Two marks in one place: the swatch says who, the ring around it says
              * whether they are here. Stacked rather than set side by side, because a
              * second dot on a chip this size reads as a second person.
              */}
            <View style={[styles.dot, { backgroundColor: avatar.color }, live !== undefined && (
                live ? styles.dotLive : styles.dotAway
            )]} />

            <AppText style={styles.name} numberOfLines={1}>
                {you ? 'Jij' : player.name}
            </AppText>

            {/* While somebody is typing, what they are doing is more use than their score. */}
            {typing
                ? <AppText style={styles.typing}>typt…</AppText>
                : <AppText style={styles.score}>{player.score}</AppText>}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        // A horizontal ScrollView stretches to its content's height otherwise, which in a
        // column parent means it tries to take the whole board.
        flexGrow: 0
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.two,
        // Room for the hard shadow, which sits outside the chip's own box.
        paddingBottom: Spacing.half + 2,
        paddingRight: Spacing.half + 2
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        maxWidth: 160,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },
    // Your own chip stands a step proud of the rest, the way a selected tile does.
    chipYou: {
        backgroundColor: theme.colors.background,
        ...theme.shadows.hard
    },
    // Whoever the board is waiting on. Outlined in the app's accent rather than
    // filled with it: the chip still has to read as the same chip it was a moment ago.
    chipUp: {
        borderColor: theme.colors.primary
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border
    },
    // Here. The ring is what carries it, so the swatch underneath stays the player's
    // own colour and the two facts do not fight over one dot.
    dotLive: {
        borderColor: theme.colors.mint
    },
    // Gone. Dimmed as well as ringed, because a colour alone is a poor thing to
    // hang "this person cannot see the board" on.
    dotAway: {
        borderColor: theme.colors.destructive,
        opacity: 0.55
    },
    name: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.text
    },
    score: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.text
    },
    typing: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        fontStyle: 'italic',
        color: theme.colors.textSecondary
    }
}))
