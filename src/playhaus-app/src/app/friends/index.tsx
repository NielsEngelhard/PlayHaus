import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

export default function FriendsPage() {
    return (
        <View style={styles.container}>
            <SimpleTextHero
                title='Vrienden'
                description='Speel samen, houd bij wie er wint en daag elkaar uit.'
            />

            <InlineNotification
                title='Binnenkort'
                icon='clock'
                message='Vriendenlijsten, uitnodigingen en onderlinge standen komen eraan. Voor nu speel je samen via een roomcode.'
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
