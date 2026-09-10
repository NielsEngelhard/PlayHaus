import { inviteFriend } from "@/api/calls/friends";
import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { Spacing } from "@/constants/theme";
import FriendRow from "@/features/friends/components/FriendRow";
import { useFriends } from "@/features/friends/useFriends";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useState } from "react";
import { ScrollView, View } from "react-native";

/** How far the list is allowed to grow before it scrolls instead. */
const MAX_LIST_HEIGHT = 280;

type Sending = 'sending' | 'sent' | 'failed';

interface Props {
    visible: boolean,
    onClose: () => void,
    /** The room they are being asked into. */
    code: string,
    /** Who is already sitting there, by user id. Their rows are disabled rather than dropped. */
    seated: Set<string>
}

// The host's way of filling a free seat with somebody they have already played with.
export default function InviteFriendModal({ visible, onClose, code, seated }: Props) {
    const t = useT();

    return (
        <PopupModal
            visible={visible}
            title={t('invite.title')}
            message={t('invite.message')}
            onRequestClose={onClose}
        >
            <InviteList code={code} seated={seated} />

            <TextButton text={t('common.close')} onPress={onClose} fullWidth />
        </PopupModal>
    )
}

// Mounted only while the panel is on screen, which is what keeps the fetch off every lobby.
function InviteList({ code, seated }: { code: string, seated: Set<string> }) {
    const styles = useStyles();
    const t = useT();

    const { friends, status, error, refresh } = useFriends();

    const [sending, setSending] = useState<Record<string, Sending>>({});

    async function send(userId: string) {
        setSending(state => ({ ...state, [userId]: 'sending' }));

        try {
            await inviteFriend(code, userId);
            setSending(state => ({ ...state, [userId]: 'sent' }));
        } catch {
            // The row says so and stays pressable: a refusal here is usually a seat that filled while the panel was open.
            setSending(state => ({ ...state, [userId]: 'failed' }));
        }
    }

    if (status === 'loading') {
        return <AppText style={styles.note}>{t('common.loading')}</AppText>;
    }

    if (status === 'failed') {
        return (
            <View style={styles.failed}>
                <AppText style={styles.note}>{t(error ?? 'invite.loadFailed')}</AppText>
                <TextButton text={t('common.retry')} onPress={refresh} />
            </View>
        )
    }

    if (friends.length === 0) {
        return <AppText style={styles.note}>{t('invite.noFriends')}</AppText>;
    }

    return (
        <ScrollView style={styles.list} contentContainerStyle={styles.rows}>
            {friends.map(friend => {
                const here = seated.has(friend.userId);
                const state = sending[friend.userId];

                return (
                    <FriendRow
                        key={friend.userId}
                        name={friend.name}
                        avatarColorId={friend.avatarColorId}
                        disabled={here || state === 'sending' || state === 'sent'}
                        onPress={() => void send(friend.userId)}
                        right={
                            <AppText style={[styles.state, state === 'failed' && styles.stateFailed]}>
                                {t(inviteLabelKey(here, state))}
                            </AppText>
                        }
                    />
                )
            })}
        </ScrollView>
    )
}

// The word on the far side of a row: where they are, or how far the invite got.
function inviteLabelKey(here: boolean, state: Sending | undefined): TranslationKey {
    if (here) return 'invite.alreadyHere';

    switch (state) {
        case 'sending':
            return 'common.busy';
        case 'sent':
            return 'invite.sent';
        case 'failed':
            return 'invite.failed';
        default:
            return 'invite.send';
    }
}

const useStyles = createThemedStyles(theme => ({
    list: {
        width: '100%',
        maxHeight: MAX_LIST_HEIGHT,
        marginBottom: Spacing.three
    },
    rows: {
        gap: 8
    },
    note: {
        marginBottom: Spacing.three,
        fontSize: 13,
        lineHeight: 13 * 1.45,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    failed: {
        alignItems: 'center',
        gap: Spacing.two,
        marginBottom: Spacing.three
    },
    state: {
        flexShrink: 0,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: theme.colors.textMuted
    },
    stateFailed: {
        color: theme.colors.destructiveText
    }
}))
