import type { GamePlayer } from "@/api/calls/league-of-letters";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { View } from "react-native";

interface Props {
    players: GamePlayer[],
    /** Whose game this is, so one row can read `Jij` instead of a name. */
    userId: string,
    /**
     * Who is connected right now, drawn as the ring around the swatch — the same mark
     * `PlayerScoreRow` puts on a chip.
     *
     * It earns its place on a result because of what happens next: the host decides from
     * this screen whether to play again with the same people, and who is still on the
     * other end is exactly what that decision is about.
     *
     * Left out where there is nobody to be connected, which is every solo game.
     */
    online?: Set<string>
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
export default function FinalScoreboard({ players, userId, online }: Props) {
    const styles = useStyles();

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
                    // Undefined means nobody is tracking presence, which is not the same
                    // as "away" — that would put every light out on a solo result.
                    live={online === undefined ? undefined : online.has(player.userId)}
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
    live?: boolean,
    divided: boolean
}

function ScoreLine({ player, place, you, live, divided }: ScoreLineProps) {
    const styles = useStyles();
    const t = useT();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.line, divided && styles.divided]}>
            <View style={[styles.place, place === 1 && styles.placeFirst]}>
                <AppText style={styles.placeText}>{place}</AppText>
            </View>

            <View style={[styles.dot, { backgroundColor: avatar.color }, live !== undefined && (
                live ? styles.dotLive : styles.dotAway
            )]} />

            <AppText style={[styles.name, you && styles.nameYou]} numberOfLines={1}>
                {you ? t('common.you') : player.name}
            </AppText>

            <AppText style={styles.score}>{player.score}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
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
        borderTopColor: theme.colors.border
    },
    place: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999,
        backgroundColor: theme.colors.muted,
        ...theme.shadows.hardSmall
    },
    // The winner's number is the one thing on the page worth a colour.
    placeFirst: {
        backgroundColor: theme.colors.lemon
    },
    placeText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border
    },
    // Still here. Same two marks as the board's chips, so a light means the same thing
    // on the result as it did while the game was on.
    dotLive: {
        borderColor: theme.colors.mint
    },
    dotAway: {
        borderColor: theme.colors.destructive,
        opacity: 0.55
    },
    name: {
        // Takes the slack, so the score stays pinned to the right-hand edge however
        // long or short the name is.
        flex: 1,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: theme.colors.text
    },
    nameYou: {
        fontWeight: 900
    },
    score: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        // Outfit Black is wide enough to need pulling in, the same as the board's tiles.
        letterSpacing: -0.5,
        color: theme.colors.text
    }
}))
