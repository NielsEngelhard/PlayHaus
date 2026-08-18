import { MAX_LOBBY_PLAYERS, type LobbyPlayer } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { FontSizes, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    players: LobbyPlayer[],
    /** Whose room this is, so one row can be marked as the one that runs it. */
    hostId: string,
    /** Whose screen this is, so one row can read as yours. */
    userId: string | undefined,
    /**
     * Who has the room open right now, by user id.
     *
     * A seat and a person are different things: somebody can be in the room —
     * holding a seat, counted in the total, about to be dealt turns — while their
     * phone is locked and they cannot see a word of it. The host is about to start a
     * game on these people, so which of them are actually there is worth a mark.
     */
    online: Set<string>
}

/**
 * Who is in the room, and how much room is left.
 *
 * The empty seats are drawn rather than counted: a lobby is a screen you sit and watch,
 * and a row appearing in a gap that was already there says "someone arrived" far more
 * plainly than a number going from two to three.
 */
export default function LobbyPlayerList({ players, hostId, userId, online }: Props) {
    const styles = useStyles();

    const free = Math.max(0, MAX_LOBBY_PLAYERS - players.length);

    return (
        <Card>
            <View style={styles.header}>
                <AppText style={styles.label}>Spelers</AppText>

                <AppText style={styles.count}>{players.length} / {MAX_LOBBY_PLAYERS}</AppText>
            </View>

            <View style={styles.list}>
                {players.map(player => (
                    <PlayerRow
                        key={player.userId}
                        player={player}
                        host={player.userId === hostId}
                        you={player.userId === userId}
                        live={online.has(player.userId)}
                    />
                ))}

                {Array.from({ length: free }, (_, index) => (
                    <EmptySeat key={`free-${index}`} />
                ))}
            </View>
        </Card>
    )
}

interface PlayerRowProps {
    player: LobbyPlayer,
    host: boolean,
    you: boolean,
    live: boolean
}

function PlayerRow({ player, host, you, live }: PlayerRowProps) {
    const styles = useStyles();

    const avatar = avatarColorById(player.avatarColorId);

    // Spread rather than sliced: a name starting with an emoji or an accented pair would
    // otherwise be cut in half and come out as a broken glyph.
    const initial = [...player.name][0]?.toUpperCase() ?? '?';

    return (
        <View style={[styles.row, styles.rowTaken]}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initial, { color: avatar.foreground }]}>{initial}</AppText>

                {/*
                  * Whether they are actually here. Sat on the corner of the avatar
                  * rather than given a column of its own, which is where a status
                  * light goes everywhere else people are listed.
                  */}
                <View
                    style={[styles.status, live ? styles.statusLive : styles.statusAway]}
                    accessibilityRole='text'
                    accessibilityLabel={live ? 'Online' : 'Offline'}
                />
            </View>

            <AppText style={styles.name} numberOfLines={1}>{player.name}</AppText>

            {/* Yours first: on your own row it is the faster of the two to find. */}
            {you && <Tag text='Jij' />}
            {host && <Tag text='Host' />}
        </View>
    )
}

/** A seat nobody has taken. Drawn open, so the room reads as unfinished. */
function EmptySeat() {
    const styles = useStyles();

    return (
        <View style={[styles.row, styles.rowEmpty]} accessibilityRole='text' accessibilityLabel='Vrije plek'>
            <View style={styles.avatarEmpty} />

            <AppText style={styles.waiting}>Wachten op een speler…</AppText>
        </View>
    )
}

const AVATAR_SIZE = 36;

/** The live dot. Big enough to read at a glance, small enough not to crop the initial. */
const STATUS_SIZE = 13;

const useStyles = createThemedStyles(theme => ({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three
    },
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    count: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        // The left-hand digit changes as people arrive; without this the label twitches.
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },
    list: {
        marginTop: Spacing.three,
        gap: Spacing.two
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two + Spacing.one,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.two + Spacing.one,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14
    },
    // Somebody is here: stands up off the card the way a chosen tile does.
    rowTaken: {
        backgroundColor: theme.colors.background,
        ...theme.shadows.hardSmall
    },
    // A seat sits back instead: no shadow, no fill of its own, and a broken outline so it
    // does not read as a person with a blank name. The shadow is added by `rowTaken`
    // rather than cancelled here — there is no reliable way to unset one.
    rowEmpty: {
        borderStyle: 'dashed',
        opacity: 0.55
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border
    },
    // On the avatar's corner, overhanging it slightly so it reads as a badge on the
    // person rather than a hole punched in them.
    status: {
        position: 'absolute',
        right: -3,
        bottom: -3,
        width: STATUS_SIZE,
        height: STATUS_SIZE,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.border
    },
    statusLive: {
        backgroundColor: theme.colors.mint
    },
    statusAway: {
        backgroundColor: theme.colors.destructive
    },
    avatarEmpty: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.border
    },
    initial: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        letterSpacing: -0.5
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: theme.colors.text
    },
    waiting: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        color: theme.colors.textSecondary
    }
}))
