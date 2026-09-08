import type { ScoredPlayer } from "@/components/ui/lobby-seat";
import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/utils/color-utils";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { ScrollView, StyleProp, View, ViewStyle } from "react-native";

interface Props {
    players: ScoredPlayer[],
    userId: string,
    online?: Set<string>,
    turnUserId?: string,
    style?: StyleProp<ViewStyle>
}

// Who else is playing and how they're doing, as a row of chips above the board.
export default function PlayerScoreRow({ players, userId, online, turnUserId, style }: Props) {
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
                    // Undefined means nobody is tracking presence.
                    live={online === undefined ? undefined : online.has(player.userId)}
                    up={player.userId === turnUserId}
                />
            ))}
        </ScrollView>
    )
}

interface PlayerChipProps {
    player: ScoredPlayer,
    you: boolean,
    live?: boolean,
    up: boolean,
}

function PlayerChip({ player, you, live, up }: PlayerChipProps) {
    const styles = useStyles();
    const t = useT();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.chip, you && styles.chipYou, up && styles.chipUp]}>
            {/* Whose turn it is, said in words rather than left to the outline alone. */}
            {up && (
                <View style={styles.turnBadge}>
                    <AppText style={styles.turnBadgeText}>{t('common.yourTurn')}</AppText>
                </View>
            )}

            {/* Two marks in one place: the swatch says who, the ring around it says whether they are here. */}
            <View style={[styles.dot, { backgroundColor: avatar.color }, live !== undefined && (
                live ? styles.dotLive : styles.dotAway
            )]} />

            <AppText style={styles.name} numberOfLines={1}>
                {you ? t('common.you') : player.name}
            </AppText>

             <AppText style={styles.score}>{player.score}</AppText>
        </View>
    )
}

// How far the turn badge stands above its chip, and how far past its right edge.
const TURN_BADGE_RISE = 9;
const TURN_BADGE_REACH = 4;

const useStyles = createThemedStyles(theme => ({
    scroll: {
        // A horizontal ScrollView stretches to its content's height otherwise.
        flexGrow: 0
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.two,
        // Room for the hard shadow and the turn badge, both outside the chip; held always, so the row does not shift.
        paddingTop: TURN_BADGE_RISE,
        paddingBottom: Spacing.half + 2,
        paddingRight: Spacing.half + 2 + TURN_BADGE_REACH
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
    // Whoever the board is waiting on.
    chipUp: {
        borderColor: theme.colors.primary
    },
    // The same accent as the outline it sits on, filled this time.
    turnBadge: {
        position: 'absolute',
        top: -TURN_BADGE_RISE,
        right: -TURN_BADGE_REACH,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: 1,
        paddingHorizontal: Spacing.one + 1,
        backgroundColor: theme.colors.primary
    },
    turnBadgeText: {
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: 0.5,
        color: theme.colors.textOnAccent
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border
    },
    // Here.
    dotLive: {
        borderColor: theme.colors.mint
    },
    // Gone.
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
    }
}))
