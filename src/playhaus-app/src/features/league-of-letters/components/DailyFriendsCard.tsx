import AppText from '@/components/text/AppText';
import { Brand } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import type { DailyFriend } from '@/features/league-of-letters/word-of-the-day';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { avatarColorById } from '@/utils/color-utils';
import { View } from 'react-native';

interface Props {
    friends: DailyFriend[]
}

const AVATAR_SIZE = 22;

// How the day went for the people you play with. The rows are stand-ins until there is a friends list behind them.
export default function DailyFriendsCard({ friends }: Props) {
    const styles = useStyles();
    const t = useT();

    if (friends.length === 0) {
        return (
            <View style={[styles.card, styles.empty]}>
                <View style={styles.stack}>
                    <View style={[styles.avatar, { backgroundColor: Brand.mint }]} />

                    <View style={[styles.avatar, styles.overlapped, { backgroundColor: '#FFD9C7' }]} />
                </View>

                <AppText style={styles.emptyText}>{t('lol.wordOfTheDay.friendsEmpty')}</AppText>
            </View>
        )
    }

    return (
        <View style={styles.card}>
            <AppText style={styles.eyebrow}>{t('lol.wordOfTheDay.friendsTitle')}</AppText>

            {friends.map(friend => {
                const swatch = avatarColorById(friend.avatarColorId);

                return (
                    <View key={friend.name} style={styles.row}>
                        <View style={[styles.avatar, { backgroundColor: swatch.color }]}>
                            <AppText style={[styles.initial, { color: swatch.foreground }]}>
                                {friend.name.slice(0, 1)}
                            </AppText>
                        </View>

                        <AppText style={styles.name} numberOfLines={1}>{friend.name}</AppText>

                        <AppText style={styles.result}>
                            {friend.guesses === undefined
                                ? t('lol.wordOfTheDay.friendWaiting')
                                : t(friend.guesses === 1 ? 'lol.wordOfTheDay.friendGuessesOne' : 'lol.wordOfTheDay.friendGuessesMany', { guesses: friend.guesses })}
                        </AppText>

                        <AppText style={styles.streak}>{t('lol.wordOfTheDay.friendStreak', { streak: friend.streak })}</AppText>
                    </View>
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: 9,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    },

    empty: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    stack: {
        flexDirection: 'row',
        flexShrink: 0
    },

    // The second face tucked behind the first.
    overlapped: {
        marginLeft: -8
    },

    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: theme.colors.background
    },

    initial: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase'
    },

    emptyText: {
        flex: 1,
        minWidth: 0,
        fontSize: 11,
        lineHeight: 15.4,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    eyebrow: {
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },

    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: theme.colors.text
    },

    result: {
        fontSize: 10.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    streak: {
        fontSize: 10.5,
        fontWeight: 800,
        color: theme.colors.text
    }
}))
