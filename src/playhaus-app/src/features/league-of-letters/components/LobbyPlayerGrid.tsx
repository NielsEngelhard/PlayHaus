import { MAX_LOBBY_PLAYERS, type LobbyPlayer } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { initialsFor } from "@/features/league-of-letters/components/lobby-player";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    players: LobbyPlayer[],
    /** Whose room this is, so one card can be marked as the one that runs it. */
    hostId: string,
    /** Whose screen this is, so a name can read as yours rather than as a stranger's. */
    userId: string | undefined,
    /**
     * Who has the room open right now, by user id.
     *
     * A seat and a person are different things: somebody can be in the room — holding a
     * seat, counted in the total, about to be dealt turns — while their phone is locked
     * and they cannot see a word of it. The host is about to start a game on these
     * people, so which of them are actually there is worth a line.
     */
    online: Set<string>
}

/** Two to a row. Six seats then fit in three rows, which is what the design lays out. */
const COLUMNS = 2;

const AVATAR_SIZE = 36;

/**
 * Who is in the room, and how much room is left, on the host's screen.
 *
 * The free seats are drawn rather than counted: a lobby is a screen you sit and watch,
 * and a card appearing in a gap that was already there says "somebody arrived" far more
 * plainly than a number going from two to three.
 *
 * Laid out as explicit rows of two rather than as a wrapping grid. React Native has no
 * `grid`, and percentage widths plus a gap wrap at the wrong moment — two 48% cards and
 * 10pt between them come to more than the row, so they end up one to a line.
 */
export default function LobbyPlayerGrid({ players, hostId, userId, online }: Props) {
    const t = useT();
    const styles = useStyles();

    /**
     * Every seat, taken or not. `null` is one nobody is in yet — the two are drawn side
     * by side, so they have to be one list to chop into rows.
     */
    const seats: (LobbyPlayer | null)[] = [
        ...players,
        ...Array.from({ length: Math.max(0, MAX_LOBBY_PLAYERS - players.length) }, () => null)
    ];

    const rows = Array.from(
        { length: Math.ceil(seats.length / COLUMNS) },
        (_, row) => seats.slice(row * COLUMNS, row * COLUMNS + COLUMNS)
    );

    return (
        <View>
            <View style={styles.header}>
                <AppText style={styles.label}>{t('lol.lobby.players')}</AppText>

                <AppText style={styles.count}>{t('lol.lobby.playerCount', { taken: players.length, max: MAX_LOBBY_PLAYERS })}</AppText>
            </View>

            <View style={styles.rows}>
                {rows.map((row, index) => (
                    <View key={index} style={styles.row}>
                        {row.map((seat, column) => seat === null ? (
                            <EmptySeat key={`free-${column}`} />
                        ) : (
                            <PlayerCard
                                key={seat.userId}
                                player={seat}
                                host={seat.userId === hostId}
                                you={seat.userId === userId}
                                live={online.has(seat.userId)}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </View>
    )
}

interface PlayerCardProps {
    player: LobbyPlayer,
    host: boolean,
    you: boolean,
    live: boolean
}

/** One person: their swatch, their name, and one word about them under it. */
function PlayerCard({ player, host, you, live }: PlayerCardProps) {
    const styles = useStyles();
    const t = useT();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.card, styles.cardTaken]}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(player.name)}
                </AppText>
            </View>

            <View style={styles.body}>
                <AppText style={styles.name} numberOfLines={1}>{player.name}</AppText>

                {/*
                  * One line, in the order the host needs it: who runs the lobby, and for
                  * everybody else whether they are actually looking at their screen.
                  */}
                {host ? (
                    <AppText style={styles.host}>{you ? t('lol.lobby.hostYou') : t('lol.lobby.hostTag')}</AppText>
                ) : (
                    <AppText style={[styles.status, !live && styles.statusAway]}>
                        {live ? t('lol.lobby.ready') : t('lol.lobby.away')}
                    </AppText>
                )}
            </View>
        </View>
    )
}

/** A seat nobody has taken. Drawn open, so the lobby reads as unfinished. */
function EmptySeat() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    return (
        <View
            style={[styles.card, styles.cardEmpty]}
            accessibilityRole='text'
            accessibilityLabel={t('lol.lobby.freeSeat')}
        >
            <View style={styles.avatarEmpty}>
                <Feather name='plus' size={15} color={theme.colors.textFaint} />
            </View>

            <AppText style={styles.waiting} numberOfLines={1}>{t('lol.lobby.waiting')}</AppText>
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
        gap: 10
    },
    row: {
        flexDirection: 'row',
        gap: 10
    },
    card: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 11,
        borderRadius: 18,
        borderWidth: theme.borderWidth
    },
    cardTaken: {
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    // A free seat sits back instead: no shadow, a thinner fill, and a broken outline so
    // it does not read as a person with a blank name.
    cardEmpty: {
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
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border
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
    body: {
        flex: 1,
        minWidth: 0
    },
    name: {
        fontSize: 13.5,
        fontWeight: 800,
        color: theme.colors.text
    },
    host: {
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 0.5,
        color: theme.colors.primary
    },
    status: {
        fontSize: 10.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    // Somebody whose phone is asleep. Said quietly rather than as an alarm: they are
    // still in the room, and the host may perfectly well start without them looking.
    statusAway: {
        color: theme.colors.destructiveText
    },
    waiting: {
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        fontWeight: 700,
        color: theme.colors.textFaint
    }
}))
