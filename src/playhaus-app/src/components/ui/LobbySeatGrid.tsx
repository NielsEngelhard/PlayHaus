import AppText from "@/components/text/AppText";
import { initialsFor, type LobbySeat } from "@/components/ui/lobby-seat";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { avatarColorById } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Everyone in the room, in whatever order the game's API deals them. */
    players: LobbySeat[],
    /** How many the room holds. One free seat is drawn; the rest become a count. */
    maxPlayers: number,
    /** Whose room this is, so one row can be marked as the one that runs it. */
    hostId: string,
    /** Whose screen this is, so a name can read as yours rather than as a stranger's. */
    userId: string | undefined,
    // Who has the room open right now, by user id.
    online: Set<string>,
    // The colour the host's line is written in — the game's own, from its registry entry.
    accent: string
}

const AVATAR_SIZE = 32;

// Who is in the room, and how much room is left, on the host's screen.
export default function LobbySeatGrid({ players, maxPlayers, hostId, userId, online, accent }: Props) {
    const t = useT();
    const styles = useStyles();

    const free = Math.max(0, maxPlayers - players.length);

    // The seats beyond the one drawn open.
    const remaining = free - 1;

    return (
        <View>
            <View style={styles.header}>
                <AppText style={styles.label}>{t('lobby.players')}</AppText>

                <AppText style={styles.count}>
                    {t('lobby.playerCount', { taken: players.length, max: maxPlayers })}
                </AppText>
            </View>

            <View style={styles.rows}>
                {players.map(player => (
                    <PlayerRow
                        key={player.userId}
                        player={player}
                        host={player.userId === hostId}
                        you={player.userId === userId}
                        live={online.has(player.userId)}
                        accent={accent}
                    />
                ))}

                {free > 0 && <FreeSeatRow />}
            </View>

            {remaining > 0 && (
                <AppText style={styles.moreSeats}>
                    {remaining === 1
                        ? t('lobby.moreSeatsOne')
                        : t('lobby.moreSeatsMany', { seats: remaining })}
                </AppText>
            )}
        </View>
    )
}

interface PlayerRowProps {
    player: LobbySeat,
    host: boolean,
    you: boolean,
    live: boolean,
    accent: string
}

/** One person: their swatch, their name, and one word about them on the far side. */
function PlayerRow({ player, host, you, live, accent }: PlayerRowProps) {
    const styles = useStyles();
    const t = useT();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.row, styles.rowTaken]}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(player.name)}
                </AppText>
            </View>

            <AppText style={styles.name} numberOfLines={1}>{player.name}</AppText>

            {/* One word, in the order the host needs it. */}
            {host ? (
                <AppText style={[styles.status, styles.statusHost, { color: accent }]}>
                    {you ? t('lobby.hostYou') : t('lobby.hostTag')}
                </AppText>
            ) : (
                <AppText style={[styles.status, !live && styles.statusAway]}>
                    {live ? t('lobby.ready') : t('lobby.away')}
                </AppText>
            )}
        </View>
    )
}

/** The seat nobody has taken yet. Drawn open, so the lobby reads as unfinished. */
function FreeSeatRow() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View
            style={[styles.row, styles.rowEmpty]}
            accessibilityRole='text'
            accessibilityLabel={t('lobby.freeSeat')}
        >
            <View style={styles.avatarEmpty}>
                <Feather name='plus' size={13} color={theme.colors.textFaint} />
            </View>

            <AppText style={styles.waiting} numberOfLines={1}>{t('lobby.waiting')}</AppText>
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
    rows: {
        marginTop: 10,
        gap: 8
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 16
    },
    // A thin ring rather than the app's hard border-and-shadow.
    rowTaken: {
        borderWidth: 1.5,
        borderColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : 'rgba(15, 13, 18, 0.12)',
        backgroundColor: theme.colors.backgroundSecondary
    },
    // A free seat sits back instead: a thinner fill and a broken outline, so it does not read as a person with a blank name.
    rowEmpty: {
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.scheme === 'dark'
            ? 'rgba(23, 23, 31, 0.55)'
            : 'rgba(255, 255, 255, 0.5)'
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    avatarEmpty: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    },
    initials: {
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: -0.3
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        fontWeight: 800,
        color: theme.colors.text
    },
    // The one word on the far side. It holds its width; the name gives ground instead.
    status: {
        flexShrink: 0,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: theme.colors.textMuted
    },
    // The colour is set at the call site, from the game's own accent.
    statusHost: {
        fontWeight: 800
    },
    // Somebody whose phone is asleep.
    statusAway: {
        color: theme.colors.destructiveText
    },
    waiting: {
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        fontWeight: 700,
        color: theme.colors.textFaint
    },
    moreSeats: {
        marginTop: 8,
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textFaint
    }
}))
