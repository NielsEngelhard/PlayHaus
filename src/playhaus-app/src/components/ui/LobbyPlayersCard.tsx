import AppText from '@/components/text/AppText';
import { initialsFor, type LobbySeat } from '@/components/ui/lobby-seat';
import PopPressable from '@/components/ui/PopPressable';
import SectionCard from '@/components/ui/SectionCard';
import { FontSizes, Radii, Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { avatarColorById } from '@/utils/color-utils';
import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { View } from 'react-native';

interface Props {
    hostId: string,
    maxPlayers: number,
    minPlayers: number,
    // Who has the room open right now, by user id.
    online: Set<string>,
    // Given only on the host's screen: the free seat becomes the way to fill it.
    onInvite?: () => void,
    players: LobbySeat[],
    userId: string | undefined
}

const AVATAR_SIZE = 32;

// Somebody whose phone is asleep sits back rather than turning red: it is not a fault.
const AWAY_OPACITY = 0.5;

// Who is in the room and how much room is left, the same card on the host's screen and a guest's.
export default function LobbyPlayersCard({ hostId, maxPlayers, minPlayers, online, onInvite, players, userId }: Props) {
    const t = useT();
    const styles = useStyles();

    const free = Math.max(0, maxPlayers - players.length);
    const short = Math.max(0, minPlayers - players.length);

    const cells: ReactNode[] = players.map(player => (
        <PlayerCell
            key={player.userId}
            player={player}
            host={player.userId === hostId}
            you={player.userId === userId}
            away={!online.has(player.userId)}
        />
    ));

    // Below the minimum the free seat becomes a full-width row of its own, so it is not dealt into the grid.
    if (free > 0 && short === 0) {
        cells.push(<FreeSeatCell key='free' free={free} onInvite={onInvite} />);
    }

    const rows: ReactNode[][] = [];
    for (let index = 0; index < cells.length; index += 2) {
        rows.push(cells.slice(index, index + 2));
    }

    return (
        <SectionCard
            title={userId === hostId ? t('lobby.players') : t('lobby.inLobby')}
            aside={t('lobby.playerCount', { taken: players.length, max: maxPlayers })}
        >
            <View style={styles.grid}>
                {rows.map((row, index) => (
                    <View key={index} style={styles.row}>
                        {row}

                        {row.length === 1 && <View style={styles.cell} />}
                    </View>
                ))}

                {free > 0 && short > 0 && <NeedPlayersRow short={short} onInvite={onInvite} />}
            </View>
        </SectionCard>
    )
}

interface PlayerCellProps {
    away: boolean,
    host: boolean,
    player: LobbySeat,
    you: boolean
}

function PlayerCell({ away, host, player, you }: PlayerCellProps) {
    const t = useT();
    const styles = useStyles();

    const avatar = avatarColorById(player.avatarColorId);

    const tag = host
        ? you ? t('lobby.hostYou') : t('lobby.hostTag')
        : away ? t('lobby.away') : you ? t('common.you') : null;

    return (
        <View style={[styles.cell, away && styles.away]}>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(player.name)}
                </AppText>
            </View>

            <View style={styles.text}>
                <AppText style={styles.name} numberOfLines={1}>{player.name}</AppText>

                {tag !== null && <AppText style={styles.tag} numberOfLines={1}>{tag}</AppText>}
            </View>
        </View>
    )
}

function FreeSeatCell({ free, onInvite }: { free: number, onInvite?: () => void }) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    if (!onInvite) {
        return (
            <View style={styles.cell}>
                <View style={styles.avatarEmpty} />

                <AppText style={[styles.seatTitle, styles.seatTitleQuiet]} numberOfLines={1}>
                    {t('lobby.freeSeat')}
                </AppText>
            </View>
        )
    }

    return (
        <PopPressable
            style={styles.cell}
            onPress={onInvite}
            accessibilityRole='button'
            accessibilityLabel={t('lobby.invite')}
        >
            <View style={styles.avatarEmpty}>
                <Feather name='plus' size={FontSizes.md} color={theme.colors.textSecondary} />
            </View>

            <View style={styles.text}>
                <AppText style={styles.seatTitle} numberOfLines={1}>{t('lobby.invite')}</AppText>

                <AppText style={styles.tag} numberOfLines={1}>
                    {free === 1 ? t('lobby.seatsLeftOne') : t('lobby.seatsLeftMany', { seats: free })}
                </AppText>
            </View>
        </PopPressable>
    )
}

function NeedPlayersRow({ short, onInvite }: { short: number, onInvite?: () => void }) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const title = short === 1 ? t('lobby.needPlayersOne') : t('lobby.needPlayersMany', { count: short });

    const content = (
        <>
            <View style={styles.avatarEmpty}>
                <Feather name='plus' size={FontSizes.md} color={theme.colors.textSecondary} />
            </View>

            <View style={styles.text}>
                <AppText style={styles.seatTitle}>{title}</AppText>

                {onInvite && <AppText style={styles.tag}>{t('lobby.tapToInvite')}</AppText>}
            </View>

            {onInvite && <Feather name='chevron-right' size={FontSizes.md} color={theme.colors.textSecondary} />}
        </>
    );

    if (!onInvite) {
        return <View style={styles.needRow}>{content}</View>
    }

    return (
        <PopPressable
            style={styles.needRow}
            onPress={onInvite}
            accessibilityRole='button'
            accessibilityLabel={`${title}. ${t('lobby.tapToInvite')}`}
        >
            {content}
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    grid: {
        gap: Spacing.two
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.three
    },
    cell: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    away: {
        opacity: AWAY_OPACITY
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },
    avatarEmpty: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.textSecondary
    },
    initials: {
        fontSize: FontSizes.xs,
        fontWeight: 900
    },
    text: {
        flex: 1,
        minWidth: 0
    },
    name: {
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: theme.colors.text
    },
    tag: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    seatTitle: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.text
    },
    seatTitleQuiet: {
        flex: 1,
        minWidth: 0,
        color: theme.colors.textSecondary
    },
    needRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        padding: Spacing.two,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.textSecondary
    }
}))
