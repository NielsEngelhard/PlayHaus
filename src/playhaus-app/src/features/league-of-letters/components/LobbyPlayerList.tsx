import { MAX_LOBBY_PLAYERS, type LobbyPlayer } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { avatarColorById } from "@/features/settings/profile";
import { StyleSheet, View } from "react-native";

interface Props {
    players: LobbyPlayer[],
    /** Whose room this is, so one row can be marked as the one that runs it. */
    hostId: string,
    /** Whose screen this is, so one row can read as yours. */
    userId: string | undefined
}

/**
 * Who is in the room, and how much room is left.
 *
 * The empty seats are drawn rather than counted: a lobby is a screen you sit and watch,
 * and a row appearing in a gap that was already there says "someone arrived" far more
 * plainly than a number going from two to three.
 */
export default function LobbyPlayerList({ players, hostId, userId }: Props) {
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
    you: boolean
}

function PlayerRow({ player, host, you }: PlayerRowProps) {
    const avatar = avatarColorById(player.avatarColorId);

    // Spread rather than sliced: a name starting with an emoji or an accented pair would
    // otherwise be cut in half and come out as a broken glyph.
    const initial = [...player.name][0]?.toUpperCase() ?? '?';

    return (
        <View style={[styles.row, styles.rowTaken]}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initial, { color: avatar.foreground }]}>{initial}</AppText>
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
    return (
        <View style={[styles.row, styles.rowEmpty]} accessibilityRole='text' accessibilityLabel='Vrije plek'>
            <View style={styles.avatarEmpty} />

            <AppText style={styles.waiting}>Wachten op een speler…</AppText>
        </View>
    )
}

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
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
        color: Colors.light.textSecondary
    },
    count: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        // The left-hand digit changes as people arrive; without this the label twitches.
        fontVariant: ['tabular-nums'],
        color: Colors.light.text
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
        borderColor: Colors.light.border,
        borderRadius: 14
    },
    // Somebody is here: stands up off the card the way a chosen tile does.
    rowTaken: {
        backgroundColor: Colors.light.background,
        ...Shadows.hardSmall
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
        borderColor: Colors.light.border
    },
    avatarEmpty: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.light.border
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
        color: Colors.light.text
    },
    waiting: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        color: Colors.light.textSecondary
    }
})
