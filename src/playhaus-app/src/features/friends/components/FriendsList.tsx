import type { Friend } from "@/api/calls/friends";
import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import FriendRow from "@/features/friends/components/FriendRow";
import { useT, useUiLanguage } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    friends: Friend[]
}

// Everybody you have played with, newest first, or the reason the list is empty.
export default function FriendsList({ friends }: Props) {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();

    if (friends.length === 0) {
        return (
            <View style={styles.empty}>
                <AppText style={styles.emptyTitle}>{t('friends.empty.title')}</AppText>
                <AppText style={styles.emptyMessage}>{t('friends.empty.message')}</AppText>
            </View>
        )
    }

    return (
        <View>
            <View style={styles.header}>
                <AppText style={styles.label}>{t('friends.listLabel')}</AppText>
                <AppText style={styles.count}>{friends.length}</AppText>
            </View>

            <View style={styles.rows}>
                {friends.map(friend => (
                    <FriendRow
                        key={friend.userId}
                        name={friend.name}
                        avatarColorId={friend.avatarColorId}
                        right={
                            <AppText style={styles.since}>
                                {t('friends.since', { date: sinceLabel(friend.friendsSince, language) })}
                            </AppText>
                        }
                    />
                ))}
            </View>
        </View>
    )
}

// The day you met, which is the day somebody joined a room you were in.
function sinceLabel(friendsSince: string, language: string): string {
    const met = new Date(friendsSince);

    // A server that answered with something unparseable should not put "Invalid Date" on the row.
    if (Number.isNaN(met.getTime())) return '';

    return met.toLocaleDateString(language, { day: 'numeric', month: 'short' });
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
        fontVariant: ['tabular-nums'],
        color: theme.colors.textSecondary
    },
    rows: {
        marginTop: 10,
        gap: 8
    },
    since: {
        flexShrink: 0,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: theme.colors.textMuted
    },
    // A broken outline rather than a card, so an empty list reads as unfinished instead of as a message.
    empty: {
        paddingVertical: Spacing.five,
        paddingHorizontal: Spacing.four,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        alignItems: 'center'
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: 900,
        color: theme.colors.text
    },
    emptyMessage: {
        marginTop: 6,
        maxWidth: 280,
        fontSize: 13,
        lineHeight: 13 * 1.45,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
