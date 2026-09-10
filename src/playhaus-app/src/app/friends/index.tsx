import LoadingPage from "@/components/layout/LoadingPage";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { Spacing } from "@/constants/theme";
import FriendsList from "@/features/friends/components/FriendsList";
import { useFriends } from "@/features/friends/useFriends";
import { useT } from "@/features/i18n/LanguageContext";
import { StyleSheet, View } from "react-native";

export default function FriendsPage() {
    const t = useT();

    const { friends, status, error, refresh } = useFriends();

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title={t('friends.title')}
                description={t('friends.description')}
            />

            <InlineNotification
                title={t('friends.how.title')}
                icon='users'
                message={t('friends.how.message')}
            />

            {status === 'loading' && <LoadingPage />}

            {status === 'failed' && error && (
                <InlineNotification icon='alert-triangle' title={t('common.failed')} message={t(error)}>
                    <TextButton text={t('common.retry')} onPress={refresh} />
                </InlineNotification>
            )}

            {status === 'ready' && <FriendsList friends={friends} />}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.four
    }
})
