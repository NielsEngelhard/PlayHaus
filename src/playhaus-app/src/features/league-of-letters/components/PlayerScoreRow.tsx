import type { GamePlayer } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
    players: GamePlayer[],
    /** Whose row this is, so one chip can read `Jij` instead of a name. */
    userId: string,
    /** For layout only — how the row sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * Who else is playing and how they're doing, as a row of chips above the board.
 *
 * A chip rather than a table row: the board is the screen and this has to stay out of
 * its way. It scrolls sideways, so a full room never squeezes the grid.
 */
export default function PlayerScoreRow({ players, userId, style }: Props) {
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
                <PlayerChip key={player.userId} player={player} you={player.userId === userId} />
            ))}
        </ScrollView>
    )
}

interface PlayerChipProps {
    player: GamePlayer,
    you: boolean
}

function PlayerChip({ player, you }: PlayerChipProps) {
    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.chip, you && styles.chipYou]}>
            <View style={[styles.dot, { backgroundColor: avatar.color }]} />

            <AppText style={styles.name} numberOfLines={1}>
                {you ? 'Jij' : player.name}
            </AppText>

            <AppText style={styles.score}>{player.score}</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
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
        borderColor: Colors.light.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: Colors.light.backgroundSecondary,
        ...Shadows.hardSmall
    },
    // Your own chip stands a step proud of the rest, the way a selected tile does.
    chipYou: {
        backgroundColor: Colors.light.background,
        ...Shadows.hard
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Colors.light.border
    },
    name: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: Colors.light.text
    },
    score: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: Colors.light.text
    }
})
