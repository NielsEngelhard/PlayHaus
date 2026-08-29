import { MAX_LOBBY_PLAYERS, type LobbyPlayer } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import { Brand, Spacing } from "@/constants/theme";
import { initialsFor } from "@/features/league-of-letters/components/lobby-player";
import { avatarColorById } from "@/utils/color-utils";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { View } from "react-native";

interface Props {
    players: LobbyPlayer[],
    /** Whose room this is. Marked, because they are who everyone here is waiting on. */
    hostId: string,
    /** Whose screen this is, so one row reads as yours. */
    userId: string | undefined
}

const AVATAR_SIZE = 32;

/**
 * Who else is in the room, on a guest's screen.
 *
 * One column rather than the host's two, and no free seats: a guest cannot invite anyone,
 * so a row of gaps would only be a list of things they are not allowed to do. What they
 * do want is the roll call — that the people they came in with are actually here.
 */
export default function LobbyRoster({ players, hostId, userId }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View>
            <View style={styles.header}>
                <AppText style={styles.label}>{t('lol.lobby.inLobby')}</AppText>

                <AppText style={styles.count}>{t('lol.lobby.playerCount', { taken: players.length, max: MAX_LOBBY_PLAYERS })}</AppText>
            </View>

            <View style={styles.list}>
                {players.map(player => (
                    <PlayerRow
                        key={player.userId}
                        player={player}
                        host={player.userId === hostId}
                        you={player.userId === userId}
                    />
                ))}
            </View>
        </View>
    )
}

interface PlayerRowProps {
    player: LobbyPlayer,
    host: boolean,
    you: boolean
}

/** One name, and at most one word about it. */
function PlayerRow({ player, host, you }: PlayerRowProps) {
    const t = useT();
    const styles = useStyles();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(player.name)}
                </AppText>
            </View>

            <AppText style={styles.name} numberOfLines={1}>{player.name}</AppText>

            {/*
              * The host's tag is filled and yours is outlined: one of them is the answer
              * to "who is this screen waiting for", the other is only orientation.
              */}
            {host && (
                <View style={styles.hostTag}>
                    <AppText style={styles.hostTagText}>{t('common.host')}</AppText>
                </View>
            )}

            {you && !host && (
                <View style={styles.youTag}>
                    <AppText style={styles.youTagText}>{t('common.you')}</AppText>
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    count: {
        fontSize: 12,
        fontWeight: 800,
        // The left-hand digit changes as people arrive; without this the label twitches.
        fontVariant: ['tabular-nums'],
        color: theme.colors.textSecondary
    },
    list: {
        marginTop: 10,
        gap: Spacing.two
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border
    },
    initials: {
        fontSize: 11.5,
        fontWeight: 900,
        letterSpacing: -0.3
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 800,
        color: theme.colors.text
    },
    hostTag: {
        flexShrink: 0,
        paddingVertical: 2,
        paddingHorizontal: 9,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.colors.lemon
    },
    hostTagText: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        // Ink in both schemes: it is sitting on the lemon, not beside it.
        color: Brand.ink
    },
    youTag: {
        flexShrink: 0,
        paddingVertical: 2,
        paddingHorizontal: 9,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderSubtle
    },
    youTagText: {
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.textSecondary
    }
}))
