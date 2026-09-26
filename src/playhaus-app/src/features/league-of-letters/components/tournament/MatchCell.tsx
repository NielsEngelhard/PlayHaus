import type { TournamentMatch, TournamentMatchPlayer } from "@/api/calls/league-of-letters-tournament";
import AppText from "@/components/text/AppText";
import { initialsFor } from "@/components/ui/lobby-seat";
import { Brand, FontSizes, Radii, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ReadyMark from "@/features/league-of-letters/components/tournament/ReadyMark";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    match: TournamentMatch,
    /** Whose screen this is, so their own match is picked out of the bracket. */
    userId: string | undefined,
    /** Who the ready gate is waiting on and whether each has pressed. Absent outside the round on the table. */
    readiness?: Map<string, boolean>
}

const AVATAR_SIZE = 22;
const BADGE_SIZE = 16;
const MINE_BORDER = 3;
const CELL_BORDER = 1.5;
const LABEL_SIZE = 9;

// One match of the bracket: who is in it, and how it went.
export default function MatchCell({ match, userId, readiness }: Props) {
    const styles = useStyles();
    const t = useT();

    const live = match.status === 'live';
    const pending = match.status === 'pending';
    const mine = userId !== undefined && match.players.some(player => player.userId === userId);

    return (
        <View style={[styles.cell, live && styles.cellLive, mine && styles.cellMine]}>
            {(live || pending) && (
                <View style={styles.header}>
                    <View style={styles.position}>
                        <AppText style={styles.positionText}>{match.position + 1}</AppText>
                    </View>

                    <View style={styles.spacer} />

                    {mine ? (
                        <View style={styles.youTag}>
                            <AppText style={styles.youTagText}>{t('lol.tournament.you')}</AppText>
                        </View>
                    ) : (
                        <View style={styles.badge}>
                            {live && <View style={styles.dot} />}

                            <AppText style={styles.badgeText} numberOfLines={1}>
                                {pending ? t('lol.tournament.upNext') : t('lol.tournament.playing')}
                            </AppText>
                        </View>
                    )}
                </View>
            )}

            {match.players.map(player => (
                <PlayerLine
                    key={player.userId}
                    player={player}
                    you={player.userId === userId}
                    // Nobody is dimmed while it is still anybody's match.
                    beaten={match.status === 'done' && player.userId !== match.winnerId}
                    // A score means nothing until the match has one.
                    score={match.status === 'done' ? String(player.score) : null}
                    ready={readiness?.get(player.userId)}
                />
            ))}

            {match.status === 'bye' && (
                <AppText style={styles.bye}>{t('lol.tournament.bye')}</AppText>
            )}
        </View>
    )
}

interface PlayerLineProps {
    player: TournamentMatchPlayer,
    you: boolean,
    beaten: boolean,
    score: string | null,
    ready: boolean | undefined
}

function PlayerLine({ player, you, beaten, score, ready }: PlayerLineProps) {
    const styles = useStyles();
    const t = useT();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.line, beaten && styles.lineBeaten]}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(player.name)}
                </AppText>
            </View>

            <AppText style={[styles.name, you && styles.nameYou]} numberOfLines={1}>
                {you ? t('lol.tournament.you') : player.name}
            </AppText>

            {score !== null && (
                <AppText style={[styles.score, !beaten && styles.scoreWon]}>{score}</AppText>
            )}

            {ready !== undefined && <ReadyMark ready={ready} />}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    cell: {
        flex: 1,
        gap: Spacing.one,
        padding: Spacing.two - CELL_BORDER,
        borderRadius: Radii.md,
        borderWidth: CELL_BORDER,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderSubtle : 'rgba(15, 13, 18, 0.14)',
        backgroundColor: theme.colors.backgroundSecondary
    },
    // A match still being played reads as warm rather than as finished.
    cellLive: {
        borderColor: withAlpha(Brand.mint, 0.8),
        backgroundColor: withAlpha(Brand.mint, theme.scheme === 'dark' ? 0.14 : 0.22)
    },
    // Your own match, picked out of the bracket at a glance; the thicker border eats into the padding so the cell keeps its size.
    cellMine: {
        padding: Spacing.two - MINE_BORDER,
        borderWidth: MINE_BORDER,
        borderColor: theme.colors.text,
        ...theme.shadows.hardSmall
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },
    position: {
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.sm / 2,
        backgroundColor: theme.colors.muted
    },
    positionText: {
        fontSize: LABEL_SIZE,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },
    spacer: {
        flex: 1
    },
    badge: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.available
    },
    badgeText: {
        flexShrink: 1,
        fontSize: LABEL_SIZE,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textMuted
    },
    youTag: {
        paddingHorizontal: Spacing.one + Spacing.half,
        paddingVertical: 1,
        borderRadius: Radii.full,
        backgroundColor: Brand.lemon
    },
    youTagText: {
        fontSize: LABEL_SIZE,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: Brand.ink
    },

    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one + Spacing.half
    },
    // Whoever did not come first, once the match has an answer.
    lineBeaten: {
        opacity: 0.45
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: CELL_BORDER,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    initials: {
        fontSize: 8.5,
        fontWeight: 900
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.text
    },
    nameYou: {
        fontWeight: 900
    },
    score: {
        flexShrink: 0,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        // The column of digits holds still as the matches settle.
        fontVariant: ['tabular-nums'],
        color: theme.colors.textSecondary
    },
    scoreWon: {
        color: theme.colors.text
    },

    bye: {
        fontSize: LABEL_SIZE,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textFaint
    }
}))
