import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { StyleSheet, View } from "react-native";

export default function FriendsPage() {
    const t = useT();

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title={t('friends.title')}
                description={t('friends.description')}
            />

            <InlineNotification
                title={t('friends.soon.title')}
                icon='clock'
                message={t('friends.soon.message')}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.four
    }
})
