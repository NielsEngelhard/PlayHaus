import type { ScoredPlayer } from "@/components/ui/lobby-seat";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    players: ScoredPlayer[],
    /** Whose game this is, so one row can read `Jij` instead of a name. */
    userId: string,
    // Who is connected right now, drawn as the ring around the swatch — the same mark `PlayerScoreRow` puts on a chip.
    online?: Set<string>
}

// How everyone finished, as a ranked list.
export default function FinalScoreboard({ players, userId, online }: Props) {
    const styles = useStyles();

    // Ranked here rather than trusted from the caller.
    const ranked = [...players].sort((a, b) => b.score - a.score);

    return (
        <Card style={styles.card}>
            {ranked.map((player, index) => (
                <ScoreLine
                    key={player.userId}
                    player={player}
                    place={index + 1}
                    you={player.userId === userId}
                    // Undefined means nobody is tracking presence, which is not the same as "away".
                    live={online === undefined ? undefined : online.has(player.userId)}
                    // Every row but the first is fenced off from the one above it.
                    divided={index > 0}
                />
            ))}
        </Card>
    )
}

interface ScoreLineProps {
    player: ScoredPlayer,
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
    // The rows carry their own padding so a divider can run the full width of the card rather than stopping short of its edges.
    card: {
        paddingVertical: Spacing.one,
        paddingHorizontal: 0
    },
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.four,        
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
    // Still here.
    dotLive: {
        borderColor: theme.colors.mint
    },
    dotAway: {
        borderColor: theme.colors.destructive,
        opacity: 0.55
    },
    name: {
        // Takes the slack, so the score stays pinned to the right-hand edge however long or short the name is.
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
