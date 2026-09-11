import type { TournamentMatch, TournamentMatchPlayer } from "@/api/calls/league-of-letters-tournament";
import AppText from "@/components/text/AppText";
import { initialsFor } from "@/components/ui/lobby-seat";
import { Brand, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    match: TournamentMatch,
    /** Whose screen this is, so their own match is picked out of the column. */
    userId: string | undefined
}

const AVATAR_SIZE = 22;

// One match of the bracket: who is in it, and how it went.
export default function MatchCell({ match, userId }: Props) {
    const styles = useStyles();
    const t = useT();

    const live = match.status === 'live';
    const pending = match.status === 'pending';
    const mine = userId !== undefined && match.players.some(player => player.userId === userId);

    return (
        <View style={[styles.cell, live && styles.cellLive, mine && styles.cellMine]}>
            {(live || pending) && (
                <View style={styles.badge}>
                    <View style={[styles.dot, pending && styles.dotPending]} />

                    <AppText style={styles.badgeText}>
                        {pending ? t('lol.tournament.upNext') : t('lol.tournament.playing')}
                    </AppText>
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
                    score={match.status === 'done' ? String(player.score) : '·'}
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
    score: string
}

function PlayerLine({ player, you, beaten, score }: PlayerLineProps) {
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

            <AppText style={styles.name} numberOfLines={1}>
                {you ? t('lol.tournament.you') : player.name}
            </AppText>

            <AppText style={styles.score}>{score}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    cell: {
        gap: 6,
        padding: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderSubtle : 'rgba(15, 13, 18, 0.12)',
        backgroundColor: theme.colors.backgroundSecondary
    },
    // A match still being played reads as warm rather than as finished.
    cellLive: {
        borderColor: withAlpha(Brand.mint, 0.8),
        backgroundColor: withAlpha(Brand.mint, theme.scheme === 'dark' ? 0.14 : 0.22)
    },
    // Your own match, picked out of the column at a glance.
    cellMine: {
        borderWidth: 3,
        borderColor: theme.colors.text
    },

    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: theme.colors.available
    },
    // A drawn match is not running yet, so its dot does not read as live.
    dotPending: {
        backgroundColor: theme.colors.textFaint
    },
    badgeText: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary
    },

    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
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
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    initials: {
        fontSize: 8.5,
        fontWeight: 900
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.text
    },
    score: {
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 900,
        // The column of digits holds still as the matches settle.
        fontVariant: ['tabular-nums'],
        color: theme.colors.textSecondary
    },

    bye: {
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textFaint
    }
}))
