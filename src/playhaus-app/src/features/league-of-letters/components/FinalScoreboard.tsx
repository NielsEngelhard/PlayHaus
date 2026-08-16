import type { GamePlayer } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { StyleSheet, View } from "react-native";

interface Props {
    players: GamePlayer[],
    /** Whose game this is, so one row can read `Jij` instead of a name. */
    userId: string
}

/**
 * How everyone finished, as a ranked list.
 *
 * The other half of `PlayerScoreRow`, which is the same information as chips above a
 * board that must not lose any room to it. Nothing is competing for the screen here,
 * so the result gets the full width and a place number — the two things a scoreboard
 * has that a status line does not.
 *
 * One player is a legitimate scoreboard, not a degenerate one: solo is the only mode
 * the API serves today, and a table of one still says what the game was worth.
 */
export default function FinalScoreboard({ players, userId }: Props) {
    // Ranked here rather than trusted from the caller: the API orders players by when
    // they joined, and the winner is not usually the first to arrive.
    const ranked = [...players].sort((a, b) => b.score - a.score);

    return (
        <Card style={styles.card}>
            {ranked.map((player, index) => (
                <ScoreLine
                    key={player.userId}
                    player={player}
                    place={index + 1}
                    you={player.userId === userId}
                    // Every row but the first is fenced off from the one above it. The
                    // last row keeps a clean bottom edge against the card.
                    divided={index > 0}
                />
            ))}
        </Card>
    )
}

interface ScoreLineProps {
    player: GamePlayer,
    place: number,
    you: boolean,
    divided: boolean
}

function ScoreLine({ player, place, you, divided }: ScoreLineProps) {
    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.line, divided && styles.divided]}>
            <View style={[styles.place, place === 1 && styles.placeFirst]}>
                <AppText style={styles.placeText}>{place}</AppText>
            </View>

            <View style={[styles.dot, { backgroundColor: avatar.color }]} />

            <AppText style={[styles.name, you && styles.nameYou]} numberOfLines={1}>
                {you ? 'Jij' : player.name}
            </AppText>

            <AppText style={styles.score}>{player.score}</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    // The rows carry their own padding so a divider can run the full width of the
    // card rather than stopping short of its edges.
    card: {
        paddingVertical: Spacing.one,
        paddingHorizontal: 0
    },
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four
    },
    divided: {
        borderTopWidth: 2,
        borderTopColor: Colors.light.border
    },
    place: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 999,
        backgroundColor: Colors.light.muted,
        ...Shadows.hardSmall
    },
    // The winner's number is the one thing on the page worth a colour.
    placeFirst: {
        backgroundColor: Colors.light.lemon
    },
    placeText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: Colors.light.text
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Colors.light.border
    },
    name: {
        // Takes the slack, so the score stays pinned to the right-hand edge however
        // long or short the name is.
        flex: 1,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: Colors.light.text
    },
    nameYou: {
        fontWeight: 900
    },
    score: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        // Outfit Black is wide enough to need pulling in, the same as the board's tiles.
        letterSpacing: -0.5,
        color: Colors.light.text
    }
})
