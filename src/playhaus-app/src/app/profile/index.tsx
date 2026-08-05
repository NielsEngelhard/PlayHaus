import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

// TODO: build this out once accounts exist — until then there's no player to show.
export default function ProfilePage() {
    return (
        <View style={styles.container}>
            <SimpleTextHero
                title='Profiel'
                description='Je naam, je statistieken en je instellingen op één plek.'
            />

            <AppText style={styles.todo}>TODO</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.four
    },
    todo: {
        paddingHorizontal: Spacing.one,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    }
})
